-- BAD ERA v0.2 critical integration acceptance matrix.
-- Source: tests/integration/ACCEPTANCE_MATRIX.md
--
-- Run against a database with migrations 0001..NNNN and seed.sql applied:
--   scripts/local-db.sh reset && scripts/local-db.sh acceptance
--
-- Each case raises on failure, so a non-zero exit means the matrix is broken.
-- Cases are numbered to match the matrix.

\set ON_ERROR_STOP on
\pset footer off

-- ---------------------------------------------------------------------------
-- Helper: build a durable checkout snapshot for one variant.
-- Mirrors what src/lib/checkout/create-checkout.ts writes.
-- ---------------------------------------------------------------------------
create or replace function pg_temp.make_checkout(
  p_variant_id uuid,
  p_quantity integer default 1,
  p_unit_price_cents bigint default 3000
)
returns uuid
language plpgsql
as $$
declare
  v_checkout uuid;
  v_line uuid;
  v_loc uuid;
  v_provider uuid;
  v_variant record;
  v_total bigint;
  v_component record;
  v_has_components boolean;
begin
  select id into v_loc from public.inventory_locations
    where active and fulfills_online_orders order by created_at limit 1;
  select id into v_provider from public.fulfillment_providers
    where connection_mode = 'internal' limit 1;

  select v.*, p.handle, p.title as product_title, p.kind
    into v_variant
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = p_variant_id;

  v_total := p_unit_price_cents * p_quantity;

  insert into public.checkout_sessions (
    customer_email, shipping_address_snapshot,
    subtotal_cents, total_cents, reservation_expires_at, stripe_checkout_session_id
  ) values (
    'acceptance@example.test',
    '{"name":"Acceptance","line1":"1 Test St","city":"Los Angeles","state":"CA","postal_code":"90001","country":"US"}'::jsonb,
    v_total, v_total, now() + interval '30 minutes',
    'cs_acc_' || substr(md5(random()::text), 1, 16)
  ) returning id into v_checkout;

  insert into public.checkout_lines (
    checkout_session_id, line_key, product_id, variant_id,
    product_handle_snapshot, product_title_snapshot, variant_title_snapshot,
    fulfillment_mode_snapshot, provider_id_snapshot,
    quantity, unit_price_cents, line_total_cents, is_bundle
  ) values (
    v_checkout, 'line:' || p_variant_id::text, v_variant.product_id, p_variant_id,
    v_variant.handle, v_variant.product_title, v_variant.title,
    v_variant.inventory_mode, coalesce(v_variant.fulfillment_provider_id, v_provider),
    p_quantity, p_unit_price_cents, v_total, v_variant.kind = 'bundle'
  ) returning id into v_line;

  select exists(select 1 from public.bundle_components where bundle_variant_id = p_variant_id)
    into v_has_components;

  if v_has_components then
    -- A bundle reserves its physical components, never itself.
    for v_component in
      select bc.component_variant_id, bc.quantity_required, cv.title, cv.sku,
             cv.inventory_mode, cv.fulfillment_provider_id
      from public.bundle_components bc
      join public.product_variants cv on cv.id = bc.component_variant_id
      where bc.bundle_variant_id = p_variant_id
    loop
      insert into public.checkout_line_components (
        checkout_line_id, component_variant_id, component_title_snapshot,
        component_sku_snapshot, fulfillment_mode_snapshot, provider_id_snapshot,
        location_id_snapshot, quantity_per_parent, total_quantity
      ) values (
        v_line, v_component.component_variant_id, v_component.title,
        v_component.sku, v_component.inventory_mode,
        coalesce(v_component.fulfillment_provider_id, v_provider),
        case when v_component.inventory_mode = 'stocked' then v_loc else null end,
        v_component.quantity_required, v_component.quantity_required * p_quantity
      );
    end loop;
  else
    insert into public.checkout_line_components (
      checkout_line_id, component_variant_id, component_title_snapshot,
      component_sku_snapshot, fulfillment_mode_snapshot, provider_id_snapshot,
      location_id_snapshot, quantity_per_parent, total_quantity
    ) values (
      v_line, p_variant_id, v_variant.title, v_variant.sku,
      v_variant.inventory_mode, coalesce(v_variant.fulfillment_provider_id, v_provider),
      case when v_variant.inventory_mode = 'stocked' then v_loc else null end,
      1, p_quantity
    );
  end if;

  return v_checkout;
end;
$$;

create or replace function pg_temp.variant_by(p_product text, p_variant_like text)
returns uuid
language sql
as $$
  select v.id from public.product_variants v
  join public.products p on p.id = v.product_id
  where p.title = p_product and v.title ilike p_variant_like
  limit 1;
$$;

create or replace function pg_temp.available_of(p_variant uuid)
returns integer
language sql
as $$
  select coalesce(sum(available), 0)::integer from public.inventory_levels where variant_id = p_variant;
$$;

create or replace function pg_temp.stripe_id_of(p_checkout uuid)
returns text
language sql
as $$
  select stripe_checkout_session_id from public.checkout_sessions where id = p_checkout;
$$;

-- ===========================================================================
-- Case 2 — repeating reserve_checkout_inventory is a no-op, not a second hold.
-- ===========================================================================
do $$
declare
  v_tee uuid; v_checkout uuid; v_before int; v_after int;
  v_first jsonb; v_second jsonb; v_reservations int;
begin
  v_tee := pg_temp.variant_by('BAD ERA Original Tee', '%L%');
  v_before := pg_temp.available_of(v_tee);
  v_checkout := pg_temp.make_checkout(v_tee, 1);

  v_first := public.reserve_checkout_inventory(v_checkout);
  v_second := public.reserve_checkout_inventory(v_checkout);
  v_after := pg_temp.available_of(v_tee);

  select count(*) into v_reservations
  from public.inventory_reservations where checkout_session_id = v_checkout;

  if v_first->>'status' <> 'reserved' then
    raise exception 'case 2: first reserve returned %', v_first;
  end if;
  if v_second->>'status' <> 'already_reserved' then
    raise exception 'case 2: second reserve should be already_reserved, got %', v_second;
  end if;
  if v_reservations <> 1 then
    raise exception 'case 2: expected 1 reservation row, found %', v_reservations;
  end if;
  if v_after <> v_before - 1 then
    raise exception 'case 2: available should drop by exactly 1 (% -> %)', v_before, v_after;
  end if;

  raise notice 'PASS case 2  repeat reserve is a no-op';
end $$;

-- ===========================================================================
-- Case 3 — checkout.session.expired releases committed stock exactly once.
-- ===========================================================================
do $$
declare
  v_tee uuid; v_checkout uuid; v_before int; v_after int;
begin
  v_tee := pg_temp.variant_by('BAD ERA Original Tee', '%L%');
  v_before := pg_temp.available_of(v_tee);
  v_checkout := pg_temp.make_checkout(v_tee, 1);

  perform public.reserve_checkout_inventory(v_checkout);
  perform public.release_checkout_inventory(v_checkout, 'expired');

  -- A duplicate expiry delivery must not double-release.
  begin
    perform public.release_checkout_inventory(v_checkout, 'expired');
  exception when others then
    null; -- a raise here is acceptable; silently releasing twice is not
  end;

  v_after := pg_temp.available_of(v_tee);
  if v_after <> v_before then
    raise exception 'case 3: stock not restored exactly once (% -> %)', v_before, v_after;
  end if;

  raise notice 'PASS case 3  expiry releases exactly once';
end $$;

-- ===========================================================================
-- Case 4 + 5 — delayed payment holds the reservation, then converts.
-- ===========================================================================
do $$
declare
  v_tee uuid; v_checkout uuid; v_before int; v_pending int; v_after int;
  v_order uuid; v_status text;
begin
  v_tee := pg_temp.variant_by('BAD ERA Original Tee', '%L%');
  v_before := pg_temp.available_of(v_tee);
  v_checkout := pg_temp.make_checkout(v_tee, 1);

  perform public.reserve_checkout_inventory(v_checkout);
  update public.checkout_sessions set status = 'stripe_created' where id = v_checkout;

  -- checkout.session.completed with an unpaid delayed method.
  perform public.mark_checkout_payment_pending(v_checkout);
  v_pending := pg_temp.available_of(v_tee);

  if v_pending <> v_before - 1 then
    raise exception 'case 4: payment_pending must KEEP the reservation (% -> %)', v_before, v_pending;
  end if;

  select status into v_status from public.checkout_sessions where id = v_checkout;
  if v_status <> 'payment_pending' then
    raise exception 'case 4: expected payment_pending status, got %', v_status;
  end if;

  -- async_payment_succeeded
  v_order := public.convert_paid_checkout(
    v_checkout, pg_temp.stripe_id_of(v_checkout), 'pi_acc_' || substr(md5(random()::text),1,12));
  v_after := pg_temp.available_of(v_tee);

  if v_order is null then raise exception 'case 5: no order created'; end if;
  if v_after <> v_before - 1 then
    raise exception 'case 5: on-hand must decrement exactly once (% -> %)', v_before, v_after;
  end if;

  raise notice 'PASS case 4  delayed payment holds the reservation';
  raise notice 'PASS case 5  async_payment_succeeded converts exactly once';
end $$;

-- ===========================================================================
-- Case 6 — async_payment_failed releases a payment_pending reservation.
-- ===========================================================================
do $$
declare
  v_tee uuid; v_checkout uuid; v_before int; v_after int;
begin
  v_tee := pg_temp.variant_by('BAD ERA Original Tee', '%L%');
  v_before := pg_temp.available_of(v_tee);
  v_checkout := pg_temp.make_checkout(v_tee, 1);

  perform public.reserve_checkout_inventory(v_checkout);
  update public.checkout_sessions set status = 'stripe_created' where id = v_checkout;
  perform public.mark_checkout_payment_pending(v_checkout);
  perform public.release_checkout_inventory(v_checkout, 'payment_failed');

  v_after := pg_temp.available_of(v_tee);
  if v_after <> v_before then
    raise exception 'case 6: payment_failed must restore stock (% -> %)', v_before, v_after;
  end if;

  raise notice 'PASS case 6  async_payment_failed releases the reservation';
end $$;

-- ===========================================================================
-- Case 7 + 8 — bundle conversion decrements components; replay is idempotent.
-- ===========================================================================
do $$
declare
  v_bundle uuid; v_tee uuid; v_bag uuid; v_checkout uuid;
  v_tee_before int; v_bag_before int; v_tee_after int; v_bag_after int;
  v_order uuid; v_order2 uuid; v_items int; v_movements int;
begin
  select v.id into v_bundle
  from public.product_variants v join public.products p on p.id = v.product_id
  where p.kind = 'bundle' and v.title ilike '%M%' and v.title ilike '%Blue%' limit 1;

  v_tee := pg_temp.variant_by('BAD ERA Original Tee', '%M%');
  v_bag := pg_temp.variant_by('BAD ERA Original Crossbody', '%Blue%');

  v_tee_before := pg_temp.available_of(v_tee);
  v_bag_before := pg_temp.available_of(v_bag);

  v_checkout := pg_temp.make_checkout(v_bundle, 1, 4500);
  perform public.reserve_checkout_inventory(v_checkout);
  update public.checkout_sessions set status = 'stripe_created' where id = v_checkout;

  v_order  := public.convert_paid_checkout(v_checkout, pg_temp.stripe_id_of(v_checkout), 'pi_bundle_1');
  v_order2 := public.convert_paid_checkout(v_checkout, pg_temp.stripe_id_of(v_checkout), 'pi_bundle_1');

  v_tee_after := pg_temp.available_of(v_tee);
  v_bag_after := pg_temp.available_of(v_bag);

  select count(*) into v_items from public.order_items where order_id = v_order;
  select count(*) into v_movements
  from public.inventory_movements
  where source_id = v_order and reason = 'order_sale';

  if v_order2 is distinct from v_order then
    raise exception 'case 7: replay created a second order (% vs %)', v_order, v_order2;
  end if;
  if v_items <> 1 then
    raise exception 'case 7: replay duplicated order items (found %)', v_items;
  end if;
  if v_movements <> 2 then
    raise exception 'case 7: expected 2 sale movements, found %', v_movements;
  end if;
  if v_tee_after <> v_tee_before - 1 or v_bag_after <> v_bag_before - 1 then
    raise exception 'case 8: components not decremented once each (tee % -> %, bag % -> %)',
      v_tee_before, v_tee_after, v_bag_before, v_bag_after;
  end if;
  if exists (select 1 from public.inventory_levels where variant_id = v_bundle) then
    raise exception 'case 8: a stock row exists for the bundle variant';
  end if;

  raise notice 'PASS case 7  duplicate paid events cannot duplicate an order';
  raise notice 'PASS case 8  bundle decrements components, never a bundle pool';
end $$;

-- ===========================================================================
-- Case 9 — a manual-supplier product creates a supplier task and does NOT
--          decrement internal inventory.
-- ===========================================================================
do $$
declare
  v_variant uuid; v_checkout uuid; v_order uuid;
  v_tasks int; v_movements int; v_groups int;
begin
  select v.id into v_variant
  from public.product_variants v
  where v.inventory_mode = 'manual_supplier'
  limit 1;

  if v_variant is null then
    raise notice 'SKIP case 9  no manual_supplier variant in seed';
    return;
  end if;

  -- The dev supplier product is seeded as draft; activate for the test.
  update public.products set status = 'active'
  where id = (select product_id from public.product_variants where id = v_variant);

  v_checkout := pg_temp.make_checkout(v_variant, 1, 9900);
  perform public.reserve_checkout_inventory(v_checkout);
  update public.checkout_sessions set status = 'stripe_created' where id = v_checkout;

  v_order := public.convert_paid_checkout(
    v_checkout, pg_temp.stripe_id_of(v_checkout), 'pi_manual_1');

  select count(*) into v_groups from public.fulfillment_groups where order_id = v_order;
  select count(*) into v_tasks
  from public.supplier_tasks st
  join public.fulfillment_groups fg on fg.id = st.fulfillment_group_id
  where fg.order_id = v_order;
  select count(*) into v_movements
  from public.inventory_movements
  where source_id = v_order and variant_id = v_variant and delta_on_hand <> 0;

  if v_order is null then raise exception 'case 9: no order created'; end if;
  if v_groups < 1 then raise exception 'case 9: no fulfillment group created'; end if;
  if v_tasks <> 1 then
    raise exception 'case 9: expected exactly 1 supplier task, found %', v_tasks;
  end if;
  if v_movements <> 0 then
    raise exception 'case 9: manual supplier must not move internal inventory (found %)', v_movements;
  end if;

  raise notice 'PASS case 9  manual supplier creates a task without internal decrement';
end $$;

-- ===========================================================================
-- Case 15 — published page revisions stay immutable after all migrations.
-- ===========================================================================
do $$
declare
  v_page uuid; v_revision uuid; v_blocked boolean := false;
begin
  insert into public.pages (page_key, page_kind, title, template_key)
  values ('acceptance-' || substr(md5(random()::text),1,8), 'page', 'Acceptance', 'editorial')
  returning id into v_page;

  insert into public.page_revisions (page_id, revision_number, state, note, published_at)
  values (v_page, 1, 'published', 'acceptance fixture', now())
  returning id into v_revision;

  -- A published revision is the historical record of what was live. Editing it
  -- in place would rewrite history (Master Spec §13.1).
  begin
    update public.page_revisions set note = 'tampered' where id = v_revision;
  exception when others then
    v_blocked := true;
  end;

  if not v_blocked then
    raise exception 'case 15: a published revision was mutable';
  end if;

  -- Deleting it must be blocked too.
  v_blocked := false;
  begin
    delete from public.page_revisions where id = v_revision;
  exception when others then
    v_blocked := true;
  end;

  if not v_blocked then
    raise exception 'case 15: a published revision was deletable';
  end if;

  raise notice 'PASS case 15  published revisions are immutable';
end $$;

-- ---------------------------------------------------------------------------
-- Case 16: a stale editor tab cannot overwrite newer edits (Master Spec §13.2)
--
-- Added after a live probe showed the obvious token was wrong: `updated_at` is
-- driven by now(), which is TRANSACTION start time, so two writes inside one
-- transaction share a timestamp and a stale write slipped through. The
-- monotonic `version` counter added in migration 0013 does not have that flaw.
-- ---------------------------------------------------------------------------
do $$
declare
  v_page uuid;
  v_revision uuid;
  v_section uuid;
  v_stale_version bigint;
  v_stale_time timestamptz;
  v_rows integer;
begin
  insert into public.pages (page_key, page_kind, route, title, template_key)
  values ('concurrency-probe', 'page', '/concurrency-probe', 'Probe', 'storefront.home')
  returning id into v_page;

  insert into public.page_revisions (page_id, revision_number, state)
  values (v_page, 1, 'draft')
  returning id into v_revision;

  insert into public.page_sections
    (revision_id, section_key, section_type, schema_version, position, enabled, payload)
  values (v_revision, 'probe', 'newsletter', 1, 0, true, '{"heading":"original"}'::jsonb)
  returning id, version, updated_at into v_section, v_stale_version, v_stale_time;

  -- Another tab saves first.
  update public.page_sections
  set payload = '{"heading":"newer edit"}'::jsonb
  where id = v_section;

  -- The timestamp is unchanged in this transaction, which is precisely why it
  -- cannot be the concurrency token.
  if (select updated_at from public.page_sections where id = v_section) <> v_stale_time then
    raise exception 'case 16: expected updated_at to be transaction-frozen';
  end if;

  -- The version counter DID move.
  if (select version from public.page_sections where id = v_section) = v_stale_version then
    raise exception 'case 16: version did not increment on update';
  end if;

  -- The stale tab now saves with the version it originally read.
  update public.page_sections
  set payload = '{"heading":"stale overwrite"}'::jsonb
  where id = v_section and version = v_stale_version;
  get diagnostics v_rows = row_count;

  if v_rows <> 0 then
    raise exception 'case 16: a stale write was allowed to land';
  end if;

  if (select payload->>'heading' from public.page_sections where id = v_section) <> 'newer edit' then
    raise exception 'case 16: the newer edit was lost';
  end if;

  raise notice 'PASS case 16  stale editor writes are refused';
end $$;


-- ---------------------------------------------------------------------------
-- Case 17: rollback is append-only, and a publish set records what it replaced
--          (Master Spec §13.1, §13.3)
--
-- The guarantee is that undoing a publish never destroys the thing being
-- undone. Rollback forks the old revision forward as a NEW revision, so both
-- the mistake and the correction remain in history. `publish_set_items`
-- captures where every page pointed BEFORE the set, which is the only reason a
-- whole set can be reversed later.
-- ---------------------------------------------------------------------------
do $$
declare
  v_page uuid;
  v_r1 uuid; v_r2 uuid; v_r3 uuid;
  v_set uuid;
  v_count integer;
  v_previous uuid;
begin
  insert into public.pages (page_key, page_kind, title, template_key)
  values ('acceptance-' || substr(md5(random()::text),1,8), 'page', 'Acceptance rollback', 'editorial')
  returning id into v_page;

  -- Revision 1 goes live.
  insert into public.page_revisions (page_id, revision_number, state, note, published_at)
  values (v_page, 1, 'published', 'first', now())
  returning id into v_r1;
  insert into public.page_sections (revision_id, section_key, section_type, position, payload)
  values (v_r1, 'hero', 'hero.editorial', 0, '{"heading":"first"}'::jsonb);
  update public.pages set published_revision_id = v_r1 where id = v_page;

  -- Revision 2 is drafted, then published as a set that records r1 as previous.
  insert into public.page_revisions (page_id, revision_number, state, source_revision_id)
  values (v_page, 2, 'draft', v_r1)
  returning id into v_r2;
  insert into public.page_sections (revision_id, section_key, section_type, position, payload)
  values (v_r2, 'hero', 'hero.editorial', 0, '{"heading":"second"}'::jsonb);

  insert into public.publish_sets (status, note) values ('prepared', 'acceptance')
  returning id into v_set;
  insert into public.publish_set_items (publish_set_id, page_id, revision_id, previous_revision_id)
  values (v_set, v_page, v_r2, v_r1);

  update public.page_revisions set state = 'published', published_at = now() where id = v_r2;
  update public.pages set published_revision_id = v_r2 where id = v_page;
  update public.publish_sets set status = 'published', published_at = now() where id = v_set;

  -- The set knows exactly what to restore.
  select previous_revision_id into v_previous
  from public.publish_set_items where publish_set_id = v_set and page_id = v_page;
  if v_previous is distinct from v_r1 then
    raise exception 'case 17: publish set did not record the replaced revision';
  end if;

  -- Roll back: fork r1 forward as revision 3 rather than repointing at r1.
  insert into public.page_revisions (page_id, revision_number, state, source_revision_id, note)
  values (v_page, 3, 'draft', v_r1, 'Publish set rollback')
  returning id into v_r3;
  insert into public.page_sections (revision_id, section_key, section_type, position, payload)
  select v_r3, section_key, section_type, position, payload
  from public.page_sections where revision_id = v_r1;

  update public.page_revisions set state = 'published', published_at = now() where id = v_r3;
  update public.pages set published_revision_id = v_r3 where id = v_page;
  update public.publish_sets set status = 'rolled_back' where id = v_set;

  -- Live serves the restored content...
  if (
    select ps.payload->>'heading'
    from public.page_sections ps
    join public.pages p on p.published_revision_id = ps.revision_id
    where p.id = v_page
  ) <> 'first' then
    raise exception 'case 17: rollback did not restore the earlier content';
  end if;

  -- ...and every revision, including the one that was rolled back, survives.
  select count(*) into v_count from public.page_revisions where page_id = v_page;
  if v_count <> 3 then
    raise exception 'case 17: expected 3 revisions after rollback, found %', v_count;
  end if;

  if not exists (
    select 1 from public.page_sections
    where revision_id = v_r2 and payload->>'heading' = 'second'
  ) then
    raise exception 'case 17: rollback erased the revision it undid';
  end if;

  raise notice 'PASS case 17  rollback appends a revision and preserves history';
end $$;

-- ---------------------------------------------------------------------------
-- Case 19: Studio stock changes work through the service role, and only for
--          the owner (migration 0017)
--
-- Before 0017 every Studio adjustment raised "studio owner required": the
-- callers use the service-role client, which carries no user, so the
-- function's auth.uid() check could never pass. The server now names the
-- actor it authorized and the database re-checks them.
-- ---------------------------------------------------------------------------
do $$
declare
  v_owner uuid := gen_random_uuid();
  v_customer uuid := gen_random_uuid();
  v_variant uuid := '23000000-0000-0000-0000-000000000013';
  v_location uuid;
  v_before integer;
  v_after jsonb;
begin
  insert into auth.users (id, email) values
    (v_owner, 'owner-19@acceptance.test'),
    (v_customer, 'customer-19@acceptance.test');
  insert into public.studio_users (user_id, role, active) values (v_owner, 'owner', true);

  select location_id, on_hand into v_location, v_before
    from public.inventory_levels where variant_id = v_variant limit 1;

  -- The server names the owner: the change lands and the movement says who.
  v_after := public.studio_adjust_inventory(v_variant, v_location, 3, 'stock_recount', 'case 19', v_owner);
  if (v_after->>'on_hand')::integer <> v_before + 3 then
    raise exception 'case 19: adjustment did not land';
  end if;
  if not exists (
    select 1 from public.inventory_movements
     where variant_id = v_variant and note = 'case 19' and actor_user_id = v_owner
  ) then
    raise exception 'case 19: the movement does not record who made it';
  end if;

  -- Exactly how hosted Supabase presents the server's call: the service role,
  -- no user. The named owner is honoured.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform public.studio_adjust_inventory(v_variant, v_location, -1, 'stock_recount', 'case 19 service', v_owner);
  perform set_config('request.jwt.claim.role', '', true);
  if not exists (
    select 1 from public.inventory_movements
     where variant_id = v_variant and note = 'case 19 service' and actor_user_id = v_owner
  ) then
    raise exception 'case 19: a service-role call naming the owner was refused';
  end if;

  -- No actor at all — what every Studio call looked like before 0017.
  begin
    perform public.studio_adjust_inventory(v_variant, v_location, 1, 'stock_recount', null, null);
    raise exception 'case 19: an adjustment with no actor was accepted';
  exception when insufficient_privilege then null;
  end;

  -- A customer named as the actor.
  begin
    perform public.studio_adjust_inventory(v_variant, v_location, 1, 'stock_recount', null, v_customer);
    raise exception 'case 19: a non-owner actor was accepted';
  exception when insufficient_privilege then null;
  end;

  -- A signed-in customer's token naming the owner cannot impersonate them.
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_customer::text, true);
  begin
    perform public.studio_adjust_inventory(v_variant, v_location, 1, 'stock_recount', null, v_owner);
    raise exception 'case 19: a customer token impersonated the owner';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.jwt.claim.sub', '', true);

  -- And neither browser role can reach either owner function at all.
  if has_function_privilege('authenticated',
       'public.studio_adjust_inventory(uuid,uuid,integer,public.inventory_reason,text,uuid)', 'execute')
     or has_function_privilege('anon',
       'public.studio_adjust_inventory(uuid,uuid,integer,public.inventory_reason,text,uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.studio_create_product(jsonb,uuid)', 'execute')
     or has_function_privilege('anon', 'public.studio_create_product(jsonb,uuid)', 'execute') then
    raise exception 'case 19: an owner function is executable from the browser';
  end if;

  raise notice 'PASS case 19  stock changes work for the owner only, and record who';
end $$;

-- ---------------------------------------------------------------------------
-- Case 20: a product is created whole or not at all (migration 0017)
-- ---------------------------------------------------------------------------
do $$
declare
  v_owner uuid := (select user_id from public.studio_users where role = 'owner' and active limit 1);
  v_tee uuid;
  v_set uuid;
  v_m uuid;
  v_l uuid;
  v_count integer;
begin
  v_tee := public.studio_create_product(jsonb_build_object(
    'handle', 'case-20-tee',
    'title', 'Case 20 Tee',
    'tags', jsonb_build_array('archive-01'),
    'kind', 'standard',
    'options', jsonb_build_array(jsonb_build_object('name', 'Size', 'values', jsonb_build_array('S', 'M', 'L'))),
    'variants', jsonb_build_array(
      jsonb_build_object('option_values', jsonb_build_array('S'), 'title', 'S', 'price_cents', 3000, 'starting_stock', 4),
      jsonb_build_object('option_values', jsonb_build_array('M'), 'title', 'M', 'price_cents', 3000, 'starting_stock', 0),
      jsonb_build_object('option_values', jsonb_build_array('L'), 'title', 'L', 'price_cents', 3000, 'starting_stock', 7)
    )
  ), v_owner);

  if (select status from public.products where id = v_tee) <> 'draft' then
    raise exception 'case 20: a new product went live without the owner choosing to';
  end if;

  -- Every variant has its stock row, even at zero, and its option link.
  select count(*) into v_count
    from public.product_variants pv
    join public.inventory_levels il on il.variant_id = pv.id
    join public.variant_option_values vov on vov.variant_id = pv.id
   where pv.product_id = v_tee;
  if v_count <> 3 then
    raise exception 'case 20: expected 3 stocked, linked variants, found %', v_count;
  end if;

  if (select sum(il.on_hand) from public.inventory_levels il
        join public.product_variants pv on pv.id = il.variant_id
       where pv.product_id = v_tee) <> 11 then
    raise exception 'case 20: starting stock did not land';
  end if;

  -- Starting stock is audited: one initial_stock movement per non-zero count.
  select count(*) into v_count
    from public.inventory_movements im
    join public.product_variants pv on pv.id = im.variant_id
   where pv.product_id = v_tee and im.reason = 'initial_stock' and im.actor_user_id = v_owner;
  if v_count <> 2 then
    raise exception 'case 20: expected 2 audited starting-stock movements, found %', v_count;
  end if;

  if (select count(*) from public.product_variants where product_id = v_tee and is_default) <> 1 then
    raise exception 'case 20: expected exactly one default variant';
  end if;

  -- 2XL is refused, and the refusal leaves nothing behind.
  begin
    perform public.studio_create_product(jsonb_build_object(
      'handle', 'case-20-2xl', 'title', 'Too big', 'kind', 'standard',
      'options', jsonb_build_array(jsonb_build_object('name', 'Size', 'values', jsonb_build_array('L', '2XL'))),
      'variants', jsonb_build_array(
        jsonb_build_object('option_values', jsonb_build_array('L'), 'price_cents', 3000),
        jsonb_build_object('option_values', jsonb_build_array('2XL'), 'price_cents', 3000)
      )
    ), v_owner);
    raise exception 'case 20: a 2XL size was accepted';
  exception when invalid_parameter_value then null;
  end;
  if exists (select 1 from public.products where handle = 'case-20-2xl') then
    raise exception 'case 20: a refused product left a partial row behind';
  end if;

  -- A bad second variant undoes the whole product, not just that variant.
  begin
    perform public.studio_create_product(jsonb_build_object(
      'handle', 'case-20-partial', 'title', 'Partial', 'kind', 'standard',
      'options', jsonb_build_array(jsonb_build_object('name', 'Color', 'values', jsonb_build_array('Black'))),
      'variants', jsonb_build_array(
        jsonb_build_object('option_values', jsonb_build_array('Black'), 'price_cents', 2500, 'starting_stock', 5),
        jsonb_build_object('option_values', jsonb_build_array('Green'), 'price_cents', 2500)
      )
    ), v_owner);
    raise exception 'case 20: a variant with an undeclared choice was accepted';
  exception when invalid_parameter_value then null;
  end;
  if exists (select 1 from public.products where handle = 'case-20-partial') then
    raise exception 'case 20: a half-valid product was partly written';
  end if;

  -- The web address is unique.
  begin
    perform public.studio_create_product(jsonb_build_object(
      'handle', 'case-20-tee', 'title', 'Again', 'kind', 'standard',
      'variants', jsonb_build_array(jsonb_build_object('option_values', '[]'::jsonb, 'price_cents', 100))
    ), v_owner);
    raise exception 'case 20: a duplicate web address was accepted';
  exception when unique_violation then null;
  end;

  -- A set: made of real variants, holding no stock of its own.
  select id into v_m from public.product_variants where product_id = v_tee and title = 'M';
  select id into v_l from public.product_variants where product_id = v_tee and title = 'L';

  v_set := public.studio_create_product(jsonb_build_object(
    'handle', 'case-20-set', 'title', 'Case 20 Set', 'kind', 'bundle',
    'options', jsonb_build_array(
      jsonb_build_object('name', 'Tee Size', 'values', jsonb_build_array('M', 'L')),
      jsonb_build_object('name', 'Bag Color', 'values', jsonb_build_array('Blue'))
    ),
    'variants', jsonb_build_array(
      jsonb_build_object('option_values', jsonb_build_array('M', 'Blue'), 'price_cents', 4500,
        'components', jsonb_build_array(
          jsonb_build_object('variant_id', v_m, 'quantity', 1),
          jsonb_build_object('variant_id', '23000000-0000-0000-0000-000000000013', 'quantity', 1))),
      jsonb_build_object('option_values', jsonb_build_array('L', 'Blue'), 'price_cents', 4500,
        'components', jsonb_build_array(
          jsonb_build_object('variant_id', v_l, 'quantity', 1),
          jsonb_build_object('variant_id', '23000000-0000-0000-0000-000000000013', 'quantity', 1)))
    )
  ), v_owner);

  if exists (
    select 1 from public.inventory_levels il
      join public.product_variants pv on pv.id = il.variant_id
     where pv.product_id = v_set
  ) then
    raise exception 'case 20: a set was given a stock pool of its own';
  end if;

  select count(*) into v_count
    from public.bundle_components bc
    join public.product_variants pv on pv.id = bc.bundle_variant_id
   where pv.product_id = v_set;
  if v_count <> 4 then
    raise exception 'case 20: expected 4 set components, found %', v_count;
  end if;

  if (select title from public.product_variants where product_id = v_set and position = 1) <> 'L / Blue' then
    raise exception 'case 20: a set option was not titled from its choices';
  end if;

  -- A set cannot be made of another set, nor hold stock.
  begin
    perform public.studio_create_product(jsonb_build_object(
      'handle', 'case-20-nested', 'title', 'Nested', 'kind', 'bundle',
      'variants', jsonb_build_array(jsonb_build_object('option_values', '[]'::jsonb, 'price_cents', 9000,
        'components', jsonb_build_array(jsonb_build_object(
          'variant_id', '23000000-0000-0000-0000-000000000021', 'quantity', 1))))
    ), v_owner);
    raise exception 'case 20: a set made of a set was accepted';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.studio_create_product(jsonb_build_object(
      'handle', 'case-20-stocked-set', 'title', 'Stocked set', 'kind', 'bundle',
      'variants', jsonb_build_array(jsonb_build_object('option_values', '[]'::jsonb, 'price_cents', 9000,
        'starting_stock', 3,
        'components', jsonb_build_array(jsonb_build_object('variant_id', v_m, 'quantity', 1))))
    ), v_owner);
    raise exception 'case 20: a set was given starting stock';
  exception when invalid_parameter_value then null;
  end;

  -- Only the owner.
  begin
    perform public.studio_create_product(jsonb_build_object(
      'handle', 'case-20-nobody', 'title', 'Nobody', 'kind', 'standard',
      'variants', jsonb_build_array(jsonb_build_object('option_values', '[]'::jsonb, 'price_cents', 100))
    ), gen_random_uuid());
    raise exception 'case 20: a product was created by a non-owner';
  exception when insufficient_privilege then null;
  end;

  raise notice 'PASS case 20  products are created whole, as drafts, by the owner only';
end $$;

\echo ''
\echo 'Acceptance matrix complete.'

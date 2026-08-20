-- Migration 0008: atomic inventory, paid-order conversion and Stripe event RPCs.
-- Privileged functions are SECURITY DEFINER with an empty search_path and are executable only by service_role,
-- except studio_adjust_inventory which additionally verifies the current authenticated user is the active owner.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_studio_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.studio_users su
    where su.user_id = (select auth.uid())
      and su.active = true
      and su.role = 'owner'
  );
$$;

create or replace function private.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.customers c
  where c.auth_user_id = (select auth.uid())
  limit 1;
$$;

revoke execute on function private.is_studio_owner() from public, anon, authenticated;
revoke execute on function private.current_customer_id() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_studio_owner() to authenticated;
grant execute on function private.current_customer_id() to authenticated;

create or replace function public.claim_stripe_event(
  p_stripe_event_id text,
  p_event_type text,
  p_payload_hash text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  insert into public.stripe_events(stripe_event_id, event_type, payload_hash, processing_status)
  values (p_stripe_event_id, p_event_type, p_payload_hash, 'received')
  on conflict (stripe_event_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

create or replace function public.finish_stripe_event(
  p_stripe_event_id text,
  p_processing_status text,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_processing_status not in ('processed','ignored','failed') then
    raise exception 'invalid stripe event terminal status';
  end if;
  update public.stripe_events
  set processing_status = p_processing_status,
      processed_at = now(),
      error_message = p_error_message
  where stripe_event_id = p_stripe_event_id;
end;
$$;

create or replace function public.reserve_checkout_inventory(p_checkout_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.checkout_sessions%rowtype;
  req record;
  lvl public.inventory_levels%rowtype;
  v public.product_variants%rowtype;
  onhand_to_reserve integer;
  backorder_to_reserve integer;
  before_json jsonb;
  after_json jsonb;
begin
  select * into s
  from public.checkout_sessions
  where id = p_checkout_session_id
  for update;

  if not found then raise exception 'checkout session not found'; end if;
  if s.status not in ('prepared','stripe_created') then
    raise exception 'checkout session cannot reserve from status %', s.status;
  end if;
  if s.reservation_expires_at <= now() then
    raise exception 'checkout reservation already expired';
  end if;

  if exists (
    select 1 from public.inventory_reservations ir
    where ir.checkout_session_id = s.id and ir.status in ('active','payment_pending','converted')
  ) then
    return jsonb_build_object('status','already_reserved','checkout_session_id',s.id);
  end if;

  for req in
    select
      cl.line_key,
      cl.variant_id as requested_variant_id,
      clc.component_variant_id as stock_variant_id,
      clc.location_id_snapshot as location_id,
      sum(clc.total_quantity)::integer as quantity
    from public.checkout_lines cl
    join public.checkout_line_components clc on clc.checkout_line_id = cl.id
    where cl.checkout_session_id = s.id
      and clc.fulfillment_mode_snapshot = 'stocked'
    group by cl.line_key, cl.variant_id, clc.component_variant_id, clc.location_id_snapshot
    order by clc.component_variant_id, clc.location_id_snapshot
  loop
    if req.location_id is null then
      raise exception 'stocked component % has no inventory location', req.stock_variant_id;
    end if;

    select * into v
    from public.product_variants
    where id = req.stock_variant_id;
    if not found or v.active = false then raise exception 'stock variant unavailable'; end if;

    select * into lvl
    from public.inventory_levels
    where variant_id = req.stock_variant_id and location_id = req.location_id
    for update;
    if not found then raise exception 'inventory level missing for variant %', req.stock_variant_id; end if;

    if lvl.available < req.quantity and v.continue_selling_when_out_of_stock = false then
      raise exception 'insufficient inventory for variant %: need %, available %', req.stock_variant_id, req.quantity, lvl.available;
    end if;

    onhand_to_reserve := least(req.quantity, lvl.available);
    backorder_to_reserve := req.quantity - onhand_to_reserve;
    before_json := to_jsonb(lvl);

    update public.inventory_levels il
    set committed = il.committed + onhand_to_reserve,
        backordered = il.backordered + backorder_to_reserve,
        version = il.version + 1
    where il.variant_id = req.stock_variant_id and il.location_id = req.location_id
    returning to_jsonb(il) into after_json;

    insert into public.inventory_movements(
      variant_id, location_id, reason,
      delta_on_hand, delta_committed, delta_backordered,
      before_state, after_state, source_type, source_id, source_reference, idempotency_key, note
    ) values (
      req.stock_variant_id, req.location_id, 'checkout_reserve',
      0, onhand_to_reserve, backorder_to_reserve,
      before_json, after_json, 'checkout_session', s.id, req.line_key,
      'checkout-reserve:' || s.id::text || ':' || req.stock_variant_id::text || ':' || req.location_id::text,
      'Reserved for Stripe Checkout'
    );

    insert into public.inventory_reservations(
      checkout_token, checkout_session_id, source_line_key,
      requested_variant_id, stock_variant_id, location_id, quantity,
      reserved_on_hand, reserved_backordered, status, expires_at
    ) values (
      s.checkout_token, s.id, req.line_key,
      req.requested_variant_id, req.stock_variant_id, req.location_id, req.quantity,
      onhand_to_reserve, backorder_to_reserve, 'active', s.reservation_expires_at
    );
  end loop;

  return jsonb_build_object('status','reserved','checkout_session_id',s.id);
end;
$$;

create or replace function public.mark_checkout_payment_pending(p_checkout_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.checkout_sessions
  set status = 'payment_pending'
  where id = p_checkout_session_id
    and status in ('prepared','stripe_created');

  update public.inventory_reservations
  set status = 'payment_pending'
  where checkout_session_id = p_checkout_session_id
    and status = 'active';
end;
$$;

create or replace function public.release_checkout_inventory(
  p_checkout_session_id uuid,
  p_checkout_status public.checkout_snapshot_status default 'expired'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  lvl public.inventory_levels%rowtype;
  before_json jsonb;
  after_json jsonb;
begin
  if p_checkout_status not in ('expired','payment_failed','cancelled') then
    raise exception 'invalid release checkout status %', p_checkout_status;
  end if;

  perform 1 from public.checkout_sessions where id = p_checkout_session_id for update;
  if not found then raise exception 'checkout session not found'; end if;

  for r in
    select * from public.inventory_reservations
    where checkout_session_id = p_checkout_session_id
      and status in ('active','payment_pending')
    order by stock_variant_id, location_id
    for update
  loop
    select * into lvl from public.inventory_levels
    where variant_id = r.stock_variant_id and location_id = r.location_id
    for update;
    if not found then raise exception 'inventory level missing during release'; end if;

    before_json := to_jsonb(lvl);
    update public.inventory_levels il
    set committed = il.committed - r.reserved_on_hand,
        backordered = il.backordered - r.reserved_backordered,
        version = il.version + 1
    where il.variant_id = r.stock_variant_id and il.location_id = r.location_id
      and il.committed >= r.reserved_on_hand
      and il.backordered >= r.reserved_backordered
    returning to_jsonb(il) into after_json;
    if after_json is null then raise exception 'reservation release would violate inventory state'; end if;

    insert into public.inventory_movements(
      variant_id, location_id, reason, delta_committed, delta_backordered,
      before_state, after_state, source_type, source_id, source_reference, idempotency_key, note
    ) values (
      r.stock_variant_id, r.location_id, 'reservation_release',
      -r.reserved_on_hand, -r.reserved_backordered,
      before_json, after_json, 'checkout_session', p_checkout_session_id, r.source_line_key,
      'checkout-release:' || p_checkout_session_id::text || ':' || r.id::text,
      'Checkout inventory released'
    );

    update public.inventory_reservations
    set status = case when p_checkout_status = 'expired' then 'expired' else 'released' end,
        released_at = now()
    where id = r.id;
  end loop;

  update public.checkout_sessions
  set status = p_checkout_status
  where id = p_checkout_session_id and status <> 'paid';

  return jsonb_build_object('status','released','checkout_session_id',p_checkout_session_id);
end;
$$;

create or replace function public.release_expired_checkout_inventory(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
  n integer := 0;
begin
  for rec in
    select id
    from public.checkout_sessions
    where status in ('prepared','stripe_created')
      and reservation_expires_at <= now()
    order by reservation_expires_at
    limit greatest(1, least(p_limit, 1000))
  loop
    perform public.release_checkout_inventory(rec.id, 'expired');
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.convert_paid_checkout(
  p_checkout_session_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_paid_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.checkout_sessions%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  line record;
  comp record;
  r record;
  lvl public.inventory_levels%rowtype;
  before_json jsonb;
  after_json jsonb;
  v_order_item_id uuid;
  v_component_id uuid;
  v_group_id uuid;
  v_routing public.fulfillment_routing_mode;
begin
  select * into s from public.checkout_sessions where id = p_checkout_session_id for update;
  if not found then raise exception 'checkout session not found'; end if;

  if s.status = 'paid' and s.paid_order_id is not null then
    return s.paid_order_id;
  end if;
  if s.status in ('expired','payment_failed','cancelled') then
    raise exception 'cannot pay checkout in terminal status %', s.status;
  end if;

  if s.stripe_checkout_session_id is not null and s.stripe_checkout_session_id <> p_stripe_checkout_session_id then
    raise exception 'stripe checkout session mismatch';
  end if;

  select id into v_customer_id from public.customers where email = s.customer_email limit 1;
  if v_customer_id is null then
    insert into public.customers(email, first_name, last_name, phone)
    values (
      s.customer_email,
      nullif(s.customer_snapshot->>'first_name',''),
      nullif(s.customer_snapshot->>'last_name',''),
      s.customer_phone
    ) returning id into v_customer_id;
  end if;

  insert into public.orders(
    cart_id, customer_id, customer_email, customer_phone, currency,
    subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents,
    payment_status, fulfillment_status, return_status, refund_status,
    stripe_checkout_session_id, stripe_payment_intent_id,
    customer_snapshot, shipping_address_snapshot, billing_address_snapshot, shipping_method_snapshot,
    placed_at, paid_at
  ) values (
    s.cart_id, v_customer_id, s.customer_email, s.customer_phone, s.currency,
    s.subtotal_cents, s.discount_cents, s.shipping_cents, s.tax_cents, s.total_cents,
    'paid', 'unfulfilled', 'none', 'none',
    p_stripe_checkout_session_id, p_stripe_payment_intent_id,
    s.customer_snapshot, s.shipping_address_snapshot, s.billing_address_snapshot, s.shipping_method_snapshot,
    p_paid_at, p_paid_at
  )
  on conflict (stripe_checkout_session_id) do update
    set stripe_payment_intent_id = excluded.stripe_payment_intent_id
  returning id into v_order_id;

  if exists (select 1 from public.order_items where order_id = v_order_id) then
    update public.checkout_sessions set status='paid', paid_order_id=v_order_id, paid_at=p_paid_at,
      stripe_checkout_session_id=p_stripe_checkout_session_id,
      stripe_payment_intent_id=p_stripe_payment_intent_id
    where id=s.id;
    return v_order_id;
  end if;

  for line in select * from public.checkout_lines where checkout_session_id = s.id order by created_at, id loop
    insert into public.order_items(
      order_id, product_id, variant_id, product_handle_snapshot, product_title_snapshot,
      variant_title_snapshot, sku_snapshot, options_snapshot, display_snapshot,
      fulfillment_mode_snapshot, provider_id_snapshot, quantity,
      unit_price_cents, discount_cents, tax_cents, line_total_cents, is_bundle
    ) values (
      v_order_id, line.product_id, line.variant_id, line.product_handle_snapshot, line.product_title_snapshot,
      line.variant_title_snapshot, line.sku_snapshot, line.options_snapshot, line.display_snapshot,
      line.fulfillment_mode_snapshot, line.provider_id_snapshot, line.quantity,
      line.unit_price_cents, line.discount_cents, line.tax_cents, line.line_total_cents, line.is_bundle
    ) returning id into v_order_item_id;

    for comp in select * from public.checkout_line_components where checkout_line_id = line.id order by id loop
      v_component_id := null;
      if line.is_bundle then
        insert into public.order_item_components(
          order_item_id, component_variant_id, component_title_snapshot, component_sku_snapshot,
          quantity_per_parent, total_quantity, provider_id_snapshot, location_id_snapshot
        ) values (
          v_order_item_id, comp.component_variant_id, comp.component_title_snapshot, comp.component_sku_snapshot,
          comp.quantity_per_parent, comp.total_quantity, comp.provider_id_snapshot, comp.location_id_snapshot
        ) returning id into v_component_id;
      end if;

      if comp.fulfillment_mode_snapshot = 'stocked' then
        v_routing := 'internal';
      elsif comp.fulfillment_mode_snapshot = 'manual_supplier' then
        v_routing := 'manual';
      else
        v_routing := 'automatic';
      end if;

      select fg.id into v_group_id
      from public.fulfillment_groups fg
      where fg.order_id = v_order_id
        and fg.provider_id = comp.provider_id_snapshot
        and fg.location_id is not distinct from comp.location_id_snapshot
        and fg.routing_mode = v_routing
      limit 1;

      if v_group_id is null then
        insert into public.fulfillment_groups(
          order_id, provider_id, location_id, routing_mode, canonical_status,
          auto_submit, effective_shipping_address_snapshot
        ) values (
          v_order_id, comp.provider_id_snapshot, comp.location_id_snapshot, v_routing,
          case when v_routing='internal' then 'accepted'::public.fulfillment_group_status else 'pending_submission'::public.fulfillment_group_status end,
          false, s.shipping_address_snapshot
        ) returning id into v_group_id;
      end if;

      insert into public.fulfillment_group_items(
        fulfillment_group_id, order_item_id, order_item_component_id, variant_id,
        quantity_required, quantity_fulfilled
      ) values (
        v_group_id, v_order_item_id, v_component_id, comp.component_variant_id,
        comp.total_quantity, 0
      );
    end loop;
  end loop;

  for r in
    select * from public.inventory_reservations
    where checkout_session_id=s.id and status in ('active','payment_pending')
    order by stock_variant_id, location_id
    for update
  loop
    select * into lvl from public.inventory_levels
    where variant_id=r.stock_variant_id and location_id=r.location_id for update;
    if not found then raise exception 'inventory level missing during paid conversion'; end if;
    before_json := to_jsonb(lvl);

    update public.inventory_levels il
    set on_hand = il.on_hand - r.reserved_on_hand,
        committed = il.committed - r.reserved_on_hand,
        backordered = il.backordered - r.reserved_backordered,
        version = il.version + 1
    where il.variant_id=r.stock_variant_id and il.location_id=r.location_id
      and il.on_hand >= r.reserved_on_hand
      and il.committed >= r.reserved_on_hand
      and il.backordered >= r.reserved_backordered
    returning to_jsonb(il) into after_json;
    if after_json is null then raise exception 'paid conversion would violate inventory state'; end if;

    insert into public.inventory_movements(
      variant_id, location_id, reason, delta_on_hand, delta_committed, delta_backordered,
      before_state, after_state, source_type, source_id, source_reference, idempotency_key, note
    ) values (
      r.stock_variant_id, r.location_id, 'order_sale',
      -r.reserved_on_hand, -r.reserved_on_hand, -r.reserved_backordered,
      before_json, after_json, 'order', v_order_id, r.source_line_key,
      'paid-convert:' || s.id::text || ':' || r.id::text,
      'Converted reserved stock after verified payment'
    );

    update public.inventory_reservations
    set status='converted', converted_order_id=v_order_id, converted_at=p_paid_at
    where id=r.id;
  end loop;

  insert into public.payments(
    order_id, provider, external_payment_intent_id, status,
    amount_authorized_cents, amount_captured_cents, amount_refunded_cents, currency, raw_status
  ) values (
    v_order_id, 'stripe', p_stripe_payment_intent_id, 'paid',
    s.total_cents, s.total_cents, 0, s.currency, 'paid'
  ) on conflict (external_payment_intent_id) do nothing;

  insert into public.supplier_tasks(fulfillment_group_id, status, ordering_url_snapshot, expected_cost_cents, currency)
  select fg.id, 'required', fp.ordering_url, fg.estimated_cost_cents, fg.currency
  from public.fulfillment_groups fg
  join public.fulfillment_providers fp on fp.id=fg.provider_id
  where fg.order_id=v_order_id and fg.routing_mode='manual'
  on conflict (fulfillment_group_id) do nothing;

  update public.checkout_sessions
  set status='paid', paid_order_id=v_order_id, paid_at=p_paid_at,
      stripe_checkout_session_id=p_stripe_checkout_session_id,
      stripe_payment_intent_id=p_stripe_payment_intent_id
  where id=s.id;

  if s.cart_id is not null then
    update public.carts set status='converted', converted_order_id=v_order_id where id=s.cart_id;
  end if;

  return v_order_id;
end;
$$;

create or replace function public.studio_adjust_inventory(
  p_variant_id uuid,
  p_location_id uuid,
  p_delta_on_hand integer,
  p_reason public.inventory_reason,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  lvl public.inventory_levels%rowtype;
  before_json jsonb;
  after_json jsonb;
begin
  if not (select private.is_studio_owner()) then raise exception 'studio owner required'; end if;
  if p_delta_on_hand = 0 then raise exception 'inventory adjustment delta cannot be zero'; end if;
  if p_reason in ('checkout_reserve','reservation_release','order_sale') then
    raise exception 'system inventory reason cannot be used for manual adjustment';
  end if;

  select * into lvl from public.inventory_levels
  where variant_id=p_variant_id and location_id=p_location_id for update;
  if not found then raise exception 'inventory level not found'; end if;
  if lvl.on_hand + p_delta_on_hand < lvl.committed + lvl.unavailable then
    raise exception 'adjustment would make on_hand lower than committed + unavailable';
  end if;

  before_json := to_jsonb(lvl);
  update public.inventory_levels il
  set on_hand=il.on_hand+p_delta_on_hand, version=il.version+1
  where il.variant_id=p_variant_id and il.location_id=p_location_id
  returning to_jsonb(il) into after_json;

  insert into public.inventory_movements(
    variant_id, location_id, reason, delta_on_hand,
    before_state, after_state, source_type, actor_user_id, note
  ) values (
    p_variant_id, p_location_id, p_reason, p_delta_on_hand,
    before_json, after_json, 'studio_manual', (select auth.uid()), p_note
  );

  return after_json;
end;
$$;

revoke execute on function public.claim_stripe_event(text,text,text) from public, anon, authenticated;
revoke execute on function public.finish_stripe_event(text,text,text) from public, anon, authenticated;
revoke execute on function public.reserve_checkout_inventory(uuid) from public, anon, authenticated;
revoke execute on function public.mark_checkout_payment_pending(uuid) from public, anon, authenticated;
revoke execute on function public.release_checkout_inventory(uuid,public.checkout_snapshot_status) from public, anon, authenticated;
revoke execute on function public.release_expired_checkout_inventory(integer) from public, anon, authenticated;
revoke execute on function public.convert_paid_checkout(uuid,text,text,timestamptz) from public, anon, authenticated;
revoke execute on function public.studio_adjust_inventory(uuid,uuid,integer,public.inventory_reason,text) from public, anon;

grant execute on function public.claim_stripe_event(text,text,text) to service_role;
grant execute on function public.finish_stripe_event(text,text,text) to service_role;
grant execute on function public.reserve_checkout_inventory(uuid) to service_role;
grant execute on function public.mark_checkout_payment_pending(uuid) to service_role;
grant execute on function public.release_checkout_inventory(uuid,public.checkout_snapshot_status) to service_role;
grant execute on function public.release_expired_checkout_inventory(integer) to service_role;
grant execute on function public.convert_paid_checkout(uuid,text,text,timestamptz) to service_role;
grant execute on function public.studio_adjust_inventory(uuid,uuid,integer,public.inventory_reason,text) to authenticated, service_role;

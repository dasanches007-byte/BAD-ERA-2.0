-- BAD ERA / Supabase
-- Migration 0010: fix convert_paid_checkout payment upsert against a partial unique index.
--
-- DEFECT (found by executing migrations 0001-0009 against PostgreSQL 16 for the
-- first time; static validation cannot catch it):
--
--   public.payments has a PARTIAL unique index:
--     payments_external_intent_unique_idx UNIQUE (external_payment_intent_id)
--       WHERE external_payment_intent_id IS NOT NULL
--
--   Migration 0008 wrote `on conflict (external_payment_intent_id) do nothing`.
--   PostgreSQL only infers a partial index when the statement repeats the
--   index predicate, so the clause matched no arbiter and every call raised:
--     "there is no unique or exclusion constraint matching the ON CONFLICT
--      specification"
--
--   convert_paid_checkout is the single atomic paid-order conversion. The
--   failure aborted the whole transaction, so no verified Stripe payment could
--   ever produce a BAD ERA order. Inventory stayed reserved and the webhook
--   returned 5xx forever.
--
-- FIX: repeat the index predicate so the arbiter resolves. Behaviour is
-- otherwise identical, and the conversion stays idempotent for replayed
-- Stripe events.
--
-- 0008 is left untouched so the delivered Kickoff v0.2 package keeps matching
-- its published SHA-256 checksums.

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
  ) on conflict (external_payment_intent_id) where external_payment_intent_id is not null do nothing;

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

-- CREATE OR REPLACE preserves the existing ACL, but the privilege boundary for
-- this function is a security invariant, so restate it explicitly.
revoke execute on function public.convert_paid_checkout(uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.convert_paid_checkout(uuid,text,text,timestamptz) to service_role;

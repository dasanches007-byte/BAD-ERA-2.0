-- BAD ERA / Supabase
-- Migration 0011: fix release_checkout_inventory enum assignment.
--
-- DEFECT (found by running the v0.2 acceptance matrix against PostgreSQL 16;
-- static validation cannot catch it):
--
--   public.release_checkout_inventory wrote
--     set status = case when p_checkout_status = 'expired'
--                       then 'expired' else 'released' end
--   into public.inventory_reservations.status, which is
--   public.reservation_status. A CASE whose branches are untyped string
--   literals resolves to `text`, and PostgreSQL will not implicitly assign
--   text to an enum column, so EVERY call raised:
--     "column \"status\" is of type public.reservation_status but expression
--      is of type text"
--
--   release_checkout_inventory is the ONLY path that returns reserved stock.
--   With it failing, checkout.session.expired and
--   checkout.session.async_payment_failed could never release inventory, and
--   release_expired_checkout_inventory could not sweep abandoned checkouts.
--   Every abandoned or failed checkout would strand its units permanently:
--   available would ratchet down until the catalog showed sold out while the
--   physical goods sat on the shelf.
--
--   Acceptance cases 3 and 6 both depend on this working.
--
-- FIX: cast the CASE result to public.reservation_status. Behaviour is
-- otherwise identical. Migration 0008 already uses explicit enum casts
-- elsewhere (e.g. 'accepted'::public.fulfillment_group_status); this call site
-- was simply missed.
--
-- 0008 is left untouched so the delivered Kickoff v0.2 package keeps matching
-- its published SHA-256 checksums.

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
    set status = (case when p_checkout_status = 'expired' then 'expired'
                       else 'released' end)::public.reservation_status,
        released_at = now()
    where id = r.id;
  end loop;

  update public.checkout_sessions
  set status = p_checkout_status
  where id = p_checkout_session_id and status <> 'paid';

  return jsonb_build_object('status','released','checkout_session_id',p_checkout_session_id);
end;
$$;

-- CREATE OR REPLACE preserves the existing ACL, but the privilege boundary for
-- this function is a security invariant, so restate it explicitly.
revoke execute on function public.release_checkout_inventory(uuid,public.checkout_snapshot_status) from public, anon, authenticated;
grant execute on function public.release_checkout_inventory(uuid,public.checkout_snapshot_status) to service_role;

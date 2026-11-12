-- 0018 — a Stripe event that failed is processed again when Stripe retries it.
--
-- The defect (0008): claim_stripe_event inserted with `on conflict do nothing`.
-- When processing failed, finish_stripe_event marked the row 'failed' and the
-- webhook answered 5xx so that Stripe would retry, but every retry hit the
-- existing row, claimed nothing, and was answered 200 without doing anything.
-- A transient error in convert_paid_checkout therefore lost a PAID order: the
-- customer was charged and no order, inventory conversion or fulfillment group
-- was ever written, and Stripe stopped retrying because it had been told the
-- event was received.
--
-- Now a retry re-claims the event when its last attempt FAILED, or when an
-- attempt has sat in 'received' for ten minutes (the process died mid-way, so
-- it never reached finish_stripe_event). Every other repeat is still a no-op:
-- a processed or ignored event, and one being processed right now.
--
-- Re-processing is safe because the commerce RPCs are themselves idempotent:
-- convert_paid_checkout returns the same order for the same payment, and
-- release_checkout_inventory releases once. Concurrent deliveries of the same
-- failed event serialise on the row lock ON CONFLICT DO UPDATE takes; the
-- second re-evaluates the WHERE against the row the first just reset to
-- 'received' and claims nothing.

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
  claimed_count integer;
begin
  insert into public.stripe_events(stripe_event_id, event_type, payload_hash, processing_status)
  values (p_stripe_event_id, p_event_type, p_payload_hash, 'received')
  on conflict (stripe_event_id) do update
    set processing_status = 'received',
        received_at = now(),
        processed_at = null,
        error_message = null
    where public.stripe_events.processing_status = 'failed'
       or (public.stripe_events.processing_status = 'received'
           and public.stripe_events.received_at < now() - interval '10 minutes');
  get diagnostics claimed_count = row_count;
  return claimed_count = 1;
end;
$$;

-- `create or replace` keeps the grants 0008 gave; restated so this file alone
-- says who may call it.
revoke execute on function public.claim_stripe_event(text, text, text) from public, anon, authenticated;
grant execute on function public.claim_stripe_event(text, text, text) to service_role;

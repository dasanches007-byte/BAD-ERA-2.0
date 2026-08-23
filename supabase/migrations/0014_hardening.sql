-- BAD ERA / Supabase
-- Migration 0014: Phase 9 hardening (Master Spec §17).
--
-- Three changes, all defence-in-depth rather than new behaviour:
--
--   1. a durable rate-limit counter, so the limits required by §17 ("rate-limit
--      auth, support submission and sensitive mutations") survive a serverless
--      cold start and hold across instances
--   2. `citext` moved out of `public` (Supabase linter 0014_extension_in_public)
--   3. `studio_adjust_inventory` revoked from `authenticated`
--
-- ---------------------------------------------------------------------------
-- 1. Rate limiting
-- ---------------------------------------------------------------------------
--
-- In-memory counters are the obvious implementation and the wrong one here:
-- every serverless instance gets its own map, so the effective limit is
-- (limit x instances) and a cold start resets it to zero. An attacker does not
-- have to defeat that — they just have to arrive on a new instance.
--
-- The table lives in `private`, which migration 0008 already revoked from
-- public/anon/authenticated, and is reachable only through the SECURITY DEFINER
-- function below. Rate-limit state is operational data; it is never customer
-- readable, and the subject is stored pre-hashed by the caller so a raw IP
-- address is never written to the database.

create table if not exists private.rate_limit_counters (
  bucket text not null,
  subject text not null,
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (bucket, subject, window_start)
);

create index if not exists rate_limit_counters_window_idx
  on private.rate_limit_counters(window_start);

/**
 * Consume one unit from a fixed window, atomically.
 *
 * Fixed window rather than sliding: a sliding window needs per-request rows and
 * a range scan on every check, and this runs on the hot path of sign-in. The
 * known cost of a fixed window is a burst across a boundary (up to 2x the limit
 * in one window's time); for abuse control on auth and support submission that
 * is an acceptable trade, and the limits are set with it in mind.
 *
 * The INSERT ... ON CONFLICT DO UPDATE is one statement, so concurrent requests
 * serialise on the primary key rather than racing a read-then-write.
 */
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'rate limit and window must be positive';
  end if;

  -- Truncate now() to the window so every caller in the same window agrees on
  -- the same bucket row without coordinating.
  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into private.rate_limit_counters (bucket, subject, window_start, count)
  values (p_bucket, p_subject, v_window_start, 1)
  on conflict (bucket, subject, window_start)
  do update set count = private.rate_limit_counters.count + 1
  returning count into v_count;

  -- Opportunistic cleanup, bounded so it can never dominate the request. Old
  -- windows are dead weight; nothing reads them.
  delete from private.rate_limit_counters
  where ctid in (
    select ctid from private.rate_limit_counters
    where window_start < v_window_start - make_interval(secs => p_window_seconds * 4)
    limit 100
  );

  return jsonb_build_object(
    'allowed', v_count <= p_limit,
    'count', v_count,
    'limit', p_limit,
    'remaining', greatest(p_limit - v_count, 0),
    'retry_after_seconds',
      greatest(
        ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - clock_timestamp())))::integer,
        0
      )
  );
end;
$$;

-- Only trusted server code may consume or observe rate-limit state. A browser
-- that could call this could burn another subject's budget.
revoke execute on function public.consume_rate_limit(text,text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,text,integer,integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. Move citext out of the public schema
-- ---------------------------------------------------------------------------
--
-- Supabase linter 0014_extension_in_public: an extension in `public` puts its
-- functions and operators in the schema PostgREST exposes, widening the API
-- surface with objects nobody intended to publish.
--
-- Safe here because nothing casts to citext by unqualified name — the type is
-- only ever used in column declarations, and a column's type is stored by OID,
-- so it follows the extension. Verified by grepping every migration for
-- `::citext` and `citext(` before moving it.
--
-- CONSEQUENCE for future migrations: a new `citext` column must be written as
-- `extensions.citext`, because BAD ERA's SECURITY DEFINER functions run with
-- `search_path = ''`.

do $$
begin
  if exists (
    select 1 from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'citext' and n.nspname = 'public'
  ) then
    execute 'alter extension citext set schema extensions';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Revoke studio_adjust_inventory from `authenticated`
-- ---------------------------------------------------------------------------
--
-- 0008 granted this to `authenticated`, which published it at
-- /rest/v1/rpc/studio_adjust_inventory for any signed-in customer to call. The
-- function does re-verify ownership internally via private.is_studio_owner(),
-- so this was never an authorization hole — but both call sites
-- (studio/inventory-actions.ts and returns/actions.ts) use the service-role
-- client, so the grant buys nothing and costs a public endpoint.
--
-- Defence in depth: the ownership check inside the function stays exactly as it
-- was. This removes the second way to reach it.

revoke execute on function public.studio_adjust_inventory(uuid,uuid,integer,public.inventory_reason,text)
  from authenticated;

-- BAD ERA / Supabase
-- Migration 0013: monotonic version counter on page_sections.
--
-- Master Spec §13.2 requires optimistic version checks so a stale editor tab
-- cannot silently overwrite newer edits.
--
-- The obvious token is `updated_at`, but a timestamp is a fragile choice:
--
--   1. `now()` is TRANSACTION start time in PostgreSQL, so two writes inside
--      one transaction receive an identical value.
--   2. `timestamptz` has microsecond resolution, so two writes in separate
--      transactions within the same microsecond are indistinguishable.
--
-- Either case makes a stale write look current. `inventory_levels` already
-- solved this with a `version bigint`; page_sections now does the same, so the
-- token advances on every write regardless of clock behaviour.

alter table public.page_sections
  add column if not exists version bigint not null default 0 check (version >= 0);

create or replace function public.bump_page_section_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Monotonic and independent of the clock. A concurrent update therefore
  -- always changes the token the other writer is holding.
  new.version = old.version + 1;
  return new;
end;
$$;

drop trigger if exists page_sections_bump_version on public.page_sections;

-- BEFORE UPDATE, and ordered after the immutability guard so a published
-- section is still rejected rather than version-bumped.
create trigger page_sections_bump_version
before update on public.page_sections
for each row execute function public.bump_page_section_version();

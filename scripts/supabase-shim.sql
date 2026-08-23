-- Local-only shim reproducing the Supabase platform objects that the BAD ERA
-- migrations depend on. Supabase provisions these automatically; a bare
-- PostgreSQL cluster does not.
--
-- FOR LOCAL MIGRATION VALIDATION ONLY.
-- Never apply this to a hosted Supabase project.
--
-- Idempotent: safe to re-run against an existing cluster.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator noinherit login;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin noinherit createrole;
  end if;
end $$;

grant anon, authenticated, service_role to authenticator;

create schema if not exists auth authorization supabase_auth_admin;
create schema if not exists extensions;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

-- Minimal stand-in for auth.users: BAD ERA only ever references its id.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- GoTrue exposes the current user id from the request JWT claims.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')::text;
$$;

grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Supabase Storage stand-in.
--
-- Migration 0012 creates the Media Library buckets and their object policies.
-- Supabase provisions the `storage` schema; a bare cluster does not, so the
-- migration could not replay locally without this.
--
-- Only the columns and constraints BAD ERA actually touches are reproduced.
-- This is NOT a functional Storage implementation — it exists so migration
-- 0012 applies and its policies can be inspected during local validation.
-- ---------------------------------------------------------------------------

create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id text primary key,
  name text not null unique,
  owner uuid references auth.users(id) on delete set null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id) on delete cascade,
  name text,
  owner uuid references auth.users(id) on delete set null,
  metadata jsonb,
  path_tokens text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now()
);

-- Supabase ships storage.objects with RLS on. The local policies from 0012 are
-- meaningless without it, and their presence is what local validation asserts.
alter table storage.objects enable row level security;

grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.objects to anon;
grant all on storage.buckets, storage.objects to service_role;

-- Supabase sets this on the `postgres` role, and it is why an extension living
-- in `extensions` still resolves unqualified in ordinary DDL. Verified against
-- the live BAD ERA project:
--   postgres = search_path="$user", public, extensions
-- Without it the local harness disagrees with the platform about whether
-- migration 0014's citext relocation is safe.
alter role postgres set search_path to "$user", public, extensions;

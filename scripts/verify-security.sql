-- Assert the BAD ERA v0.2 security invariants against a live database.
-- Exits non-zero if any invariant is violated.
\set ON_ERROR_STOP on
\pset footer off

do $$
declare
  n_tables int; n_rls int; n_owner int; n_anon int;
  n_fns int; n_nofixed int; n_secdef int; n_secdef_bad int;
begin
  select count(*) into n_tables from pg_tables where schemaname='public';
  select count(*) into n_rls from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity;
  select count(distinct tablename) into n_owner from pg_policies
    where schemaname='public' and qual like '%is_studio_owner%';
  select count(*) into n_anon from information_schema.role_table_grants
    where grantee='anon' and table_schema='public';

  -- BAD ERA's own functions only; extension functions are out of scope.
  select count(*) into n_fns from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private')
      and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e');
  select count(*) into n_nofixed from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private')
      and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')
      and not exists (select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%');
  select count(*) into n_secdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private') and p.prosecdef
      and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e');
  select count(*) into n_secdef_bad from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private') and p.prosecdef
      and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')
      and not exists (
        select 1 from unnest(coalesce(p.proconfig,'{}')) c
        -- PostgreSQL stores an empty search_path as the literal: search_path=""
        where c in ('search_path=""', 'search_path=''''', 'search_path=')
      );

  raise notice 'tables=%  rls=%  owner_policies=%  anon_grants=%', n_tables, n_rls, n_owner, n_anon;
  raise notice 'bad_era_functions=%  security_definer=%', n_fns, n_secdef;

  if n_tables <> 62 then raise exception 'expected 62 public tables, found %', n_tables; end if;
  if n_rls <> n_tables then raise exception 'RLS missing on % table(s)', n_tables - n_rls; end if;
  if n_owner <> n_tables then raise exception 'Studio-owner policy missing on % table(s)', n_tables - n_owner; end if;
  if n_anon <> 0 then raise exception 'anon holds % public-table grant(s)', n_anon; end if;
  if n_nofixed <> 0 then raise exception '% function(s) lack a fixed search_path', n_nofixed; end if;
  if n_secdef_bad <> 0 then raise exception '% SECURITY DEFINER function(s) lack search_path=""', n_secdef_bad; end if;

  raise notice 'ALL SECURITY INVARIANTS PASS';
end $$;

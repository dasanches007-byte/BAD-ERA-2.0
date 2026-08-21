-- Promote an existing Supabase Auth user to BAD ERA Studio owner.
--
-- Studio authorization comes from `studio_users`, never from JWT
-- user_metadata, which the user can edit (Security Contract v0.2 §1.1).
-- Creating the auth user itself is left to Supabase Auth — GoTrue owns
-- password hashing and the identities table, and hand-writing those rows
-- produces users that fail to sign in in subtle, version-dependent ways.
--
-- Usage (psql):
--   psql "$DATABASE_URL" -v email="'you@example.com'" -f scripts/grant-studio-owner.sql
--
-- Or run the INSERT below directly in the Supabase SQL editor, substituting
-- your email.

insert into public.studio_users (user_id, role, display_name, active)
select u.id, 'owner', coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), true
from auth.users u
where u.email = :email
on conflict (user_id) do update
  set role = 'owner',
      active = true;

select
  su.user_id,
  u.email,
  su.role,
  su.active
from public.studio_users su
join auth.users u on u.id = su.user_id;

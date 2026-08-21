-- BAD ERA / Supabase
-- Migration 0012: Storage buckets for the Media Library.
--
-- Master Spec §12 requires public storefront assets to be separated from any
-- private customer/support files. Two buckets, two different exposure rules:
--
--   media-public   storefront imagery. Public read; only the Studio owner writes.
--   media-private  customer/support attachments. No public read at all.
--
-- Storage object policies mirror the v0.2 security contract: the anonymous role
-- gets read on the public bucket ONLY, and every write is owner-gated through
-- private.is_studio_owner() rather than JWT metadata.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'media-public',
    'media-public',
    true,
    -- 25 MB. Large enough for high-resolution campaign photography, small
    -- enough that a mistaken upload fails fast.
    26214400,
    array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml','video/mp4','video/webm']
  ),
  (
    'media-private',
    'media-private',
    false,
    26214400,
    array['image/jpeg','image/png','image/webp','image/avif','application/pdf']
  )
on conflict (id) do nothing;

-- Public bucket: anyone may read a published storefront asset.
create policy "public read media-public"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'media-public');

-- Only the active Studio owner may add, replace or remove media.
create policy "studio owner writes media-public"
on storage.objects for insert
to authenticated
with check (bucket_id = 'media-public' and (select private.is_studio_owner()));

create policy "studio owner updates media-public"
on storage.objects for update
to authenticated
using (bucket_id = 'media-public' and (select private.is_studio_owner()))
with check (bucket_id = 'media-public' and (select private.is_studio_owner()));

create policy "studio owner deletes media-public"
on storage.objects for delete
to authenticated
using (bucket_id = 'media-public' and (select private.is_studio_owner()));

-- Private bucket: owner-only in every direction. No anon policy exists, so the
-- anonymous role cannot read it at all.
create policy "studio owner reads media-private"
on storage.objects for select
to authenticated
using (bucket_id = 'media-private' and (select private.is_studio_owner()));

create policy "studio owner writes media-private"
on storage.objects for insert
to authenticated
with check (bucket_id = 'media-private' and (select private.is_studio_owner()));

create policy "studio owner updates media-private"
on storage.objects for update
to authenticated
using (bucket_id = 'media-private' and (select private.is_studio_owner()))
with check (bucket_id = 'media-private' and (select private.is_studio_owner()));

create policy "studio owner deletes media-private"
on storage.objects for delete
to authenticated
using (bucket_id = 'media-private' and (select private.is_studio_owner()));

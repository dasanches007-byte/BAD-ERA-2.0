-- BAD ERA / Supabase
-- Migration 0015: register the information pages in the content model.
--
-- DEFECT (found by Phase 10 QA follow-through, after the routes were built):
--
--   Phase 10 built /about, /privacy, /terms, /shipping and /returns-policy as
--   Studio-managed content pages, and pointed the footer at them. But only
--   `home` had a row in `public.pages`, so the Site Editor listed exactly one
--   page and there was NO WAY to write the content for any of the others.
--
--   Each route rendered its honest "this page has not been published yet"
--   state, which is correct — and permanent, because the owner could never
--   publish anything. A route the owner cannot fill is not a Studio-managed
--   page; it is a dead end with a polite message.
--
-- FIX: register the pages. This is information architecture, not sample
-- content — the routes are hard-coded in the app and linked from the footer,
-- so their page records belong in a migration rather than in `seed.sql`, which
-- is development-only data that never reaches production.
--
-- Deliberately NO revisions and NO sections are created. Publishing is the
-- owner's act, and pre-publishing an empty revision would make each page report
-- itself as live while saying nothing. `getOrCreateDraft` builds the first
-- draft the moment the owner opens one in the Site Editor.
--
-- `is_system = true` marks these as structural: their routes exist in code, so
-- the records should not be deleted even though their CONTENT is fully
-- editable.

insert into public.pages (page_key, page_kind, title, route, template_key, is_system)
values
  ('about',          'page', 'About',          '/about',          'storefront.content', true),
  ('privacy',        'page', 'Privacy',        '/privacy',        'storefront.content', true),
  ('terms',          'page', 'Terms',          '/terms',          'storefront.content', true),
  ('shipping',       'page', 'Shipping',       '/shipping',       'storefront.content', true),
  ('returns-policy', 'page', 'Returns policy', '/returns-policy', 'storefront.content', true),
  ('support',        'page', 'Support',        '/support',        'storefront.content', true)
on conflict (page_key) do nothing;

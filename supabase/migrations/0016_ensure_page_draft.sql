-- ============================================================================
-- Migration 0016: one draft per page, decided by the database
--
-- The first time a page is opened in the Site Editor it has no draft, so one is
-- forked from the live revision. That was four PostgREST calls from TypeScript:
-- read the next revision number, insert the revision, copy its sections, then
-- point `page_drafts` at it. Nothing stopped a caller that wrongly believed no
-- draft existed from forking a rival, which then died on `page_drafts_pkey`
-- with its new revision already written and orphaned.
--
-- That is exactly what the owner's first session hit. The TypeScript read the
-- one-to-one `page_drafts` embed as an array, so after the first draft existed
-- every load saw "no draft". The editor created revision 2; its own preview
-- frame created revision 3 four seconds later and failed, rendering "This
-- screen failed to load". The misread is fixed in `src/lib/cms/pages.ts`; this
-- function makes the database the one place that decides, so neither a misread
-- nor two tabs opening a page at once can ever produce a second draft.
--
-- It does the whole fork in one transaction behind a row lock on the page, and
-- re-checks for a draft under that lock. Concurrent callers queue; the second
-- finds the first one's draft and returns it.
--
-- Draft-only: it never touches the published revision or its sections, which
-- migration 0006's triggers would refuse anyway.
-- ============================================================================

create or replace function public.ensure_page_draft(
  p_page_id uuid,
  p_actor uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_published uuid;
  v_draft uuid;
  v_next integer;
begin
  -- The lock is the point. Every caller for this page serialises here, and
  -- whoever arrives second reads the draft the first one committed.
  select p.published_revision_id
    into v_published
    from public.pages p
   where p.id = p_page_id
     for update;

  if not found then
    raise exception 'page % does not exist', p_page_id using errcode = 'P0002';
  end if;

  select d.revision_id
    into v_draft
    from public.page_drafts d
   where d.page_id = p_page_id;

  if v_draft is not null then
    return v_draft;
  end if;

  select coalesce(max(r.revision_number), 0) + 1
    into v_next
    from public.page_revisions r
   where r.page_id = p_page_id;

  insert into public.page_revisions (page_id, revision_number, state, source_revision_id, created_by)
  values (p_page_id, v_next, 'draft', v_published, p_actor)
  returning id into v_draft;

  -- A page that has never been published starts empty; the editor offers the
  -- registered defaults from there.
  if v_published is not null then
    insert into public.page_sections
      (revision_id, section_key, section_type, schema_version, position, enabled, payload)
    select v_draft, s.section_key, s.section_type, s.schema_version, s.position, s.enabled, s.payload
      from public.page_sections s
     where s.revision_id = v_published;
  end if;

  insert into public.page_drafts (page_id, revision_id)
  values (p_page_id, v_draft);

  return v_draft;
end;
$$;

comment on function public.ensure_page_draft(uuid, uuid) is
  'Returns the page''s draft revision, forking one from the live revision if none exists. Serialised per page by a row lock; safe to call concurrently.';

-- Trusted server code only. The Studio route checks ownership before calling;
-- a browser that could call this could create revisions on any page.
revoke execute on function public.ensure_page_draft(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.ensure_page_draft(uuid, uuid)
  to service_role;

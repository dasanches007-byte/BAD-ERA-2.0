import "server-only";

import { getStudioIdentity } from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";
import { parseSection } from "@/lib/cms/registry";
import type { Section } from "@/lib/cms/sections";

/**
 * Page and revision service (Master Spec §13).
 *
 * The model, and why it is shaped this way:
 *
 *   pages.published_revision_id  ->  the ONE revision the public site renders
 *   page_drafts.revision_id      ->  the working draft, always a SEPARATE revision
 *
 * Migration 0006 installs triggers that reject any update to a published
 * revision or its sections. So a draft can never be the published revision, and
 * publishing is a state flip on the draft rather than an edit of live content.
 * Draft edits therefore cannot touch the live site even by accident.
 *
 * Rollback republishes an older revision as a NEW revision. History is
 * append-only; nothing is ever erased.
 */

export type PageSummary = {
  id: string;
  pageKey: string;
  route: string | null;
  title: string;
  publishedRevisionId: string | null;
  hasDraft: boolean;
  draftUpdatedAt: string | null;
};

export type PageDraft = {
  pageId: string;
  pageKey: string;
  title: string;
  route: string | null;
  revisionId: string;
  revisionNumber: number;
  sections: Section[];
  /**
   * Section keys in order, with their row id and version token.
   *
   * `version` is the optimistic-concurrency token: a save carries the value it
   * read, and the update only lands if the row still holds it, so two open tabs
   * cannot silently overwrite each other (Master Spec §13.2).
   *
   * A monotonic counter rather than `updated_at`, because `now()` is
   * transaction start time — two writes in one transaction share a timestamp,
   * and microsecond resolution makes near-simultaneous writes collide.
   */
  sectionRows: {
    id: string;
    sectionKey: string;
    position: number;
    version: number;
  }[];
  publishedRevisionId: string | null;
};

export async function listPages(): Promise<PageSummary[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("pages")
    .select("id, page_key, route, title, published_revision_id, page_drafts(revision_id, autosaved_at)")
    .order("page_key");

  if (error) throw error;

  return (data ?? []).map((p) => {
    const draft = (p.page_drafts ?? []) as { revision_id: string; autosaved_at: string }[];
    return {
      id: p.id,
      pageKey: p.page_key,
      route: p.route,
      title: p.title,
      publishedRevisionId: p.published_revision_id,
      hasDraft: draft.length > 0,
      draftUpdatedAt: draft[0]?.autosaved_at ?? null,
    };
  });
}

/**
 * Read the sections of one revision, in order, validated against the registry.
 *
 * A payload that fails validation is skipped and logged rather than rendered.
 * Silently rendering an unvalidated payload is how arbitrary content reaches a
 * page; failing closed is the safer default.
 */
async function readRevisionSections(revisionId: string): Promise<{
  sections: Section[];
  rows: { id: string; sectionKey: string; position: number; version: number }[];
}> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("page_sections")
    .select(
      "id, section_key, section_type, schema_version, position, enabled, payload, version",
    )
    .eq("revision_id", revisionId)
    .order("position");

  if (error) throw error;

  const sections: Section[] = [];
  const rows: {
    id: string;
    sectionKey: string;
    position: number;
    version: number;
  }[] = [];

  for (const row of data ?? []) {
    const candidate = {
      ...(row.payload as Record<string, unknown>),
      type: row.section_type,
      sectionId: row.section_key,
      enabled: row.enabled,
      schemaVersion: row.schema_version,
    };

    const parsed = parseSection(candidate);
    if (!parsed.success) {
      console.error("[bad-era] invalid section payload; skipping", {
        revisionId,
        sectionKey: row.section_key,
        sectionType: row.section_type,
        issues: parsed.error.issues,
      });
      continue;
    }

    sections.push(parsed.data as Section);
    rows.push({
      id: row.id,
      sectionKey: row.section_key,
      position: row.position,
      version: row.version,
    });
  }

  return { sections, rows };
}

/** The sections the PUBLIC site renders. Null when the page has never published. */
export async function getPublishedSections(
  pageKey: string,
): Promise<Section[] | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("pages")
    .select("published_revision_id")
    .eq("page_key", pageKey)
    .maybeSingle();

  if (error) throw error;
  if (!data?.published_revision_id) return null;

  const { sections } = await readRevisionSections(data.published_revision_id);
  return sections;
}

/**
 * Get the working draft, creating one if none exists.
 *
 * A new draft is copied from the live revision so editing starts from what is
 * actually published, not from defaults.
 */
export async function getOrCreateDraft(pageKey: string): Promise<PageDraft | null> {
  const db = createAdminClient();

  const { data: page, error: pageError } = await db
    .from("pages")
    .select("id, page_key, title, route, published_revision_id, page_drafts(revision_id)")
    .eq("page_key", pageKey)
    .maybeSingle();

  if (pageError) throw pageError;
  if (!page) return null;

  const existingDraft = (page.page_drafts ?? []) as { revision_id: string }[];
  let revisionId = existingDraft[0]?.revision_id ?? null;

  if (!revisionId) {
    revisionId = await createDraftRevision(page.id, page.published_revision_id);
  }

  const { data: revision, error: revError } = await db
    .from("page_revisions")
    .select("id, revision_number")
    .eq("id", revisionId)
    .single();

  if (revError) throw revError;

  const { sections, rows } = await readRevisionSections(revisionId);

  return {
    pageId: page.id,
    pageKey: page.page_key,
    title: page.title,
    route: page.route,
    revisionId,
    revisionNumber: revision.revision_number,
    sections,
    sectionRows: rows,
    publishedRevisionId: page.published_revision_id,
  };
}

/** Create a fresh draft revision, copying sections from `sourceRevisionId`. */
async function createDraftRevision(
  pageId: string,
  sourceRevisionId: string | null,
): Promise<string> {
  const db = createAdminClient();

  const { data: last, error: lastError } = await db
    .from("page_revisions")
    .select("revision_number")
    .eq("page_id", pageId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) throw lastError;
  const nextNumber = (last?.revision_number ?? 0) + 1;

  // Authorship is history, not authorization: this route is already owner-gated,
  // and a null here only costs the revision list a name.
  const identity = await getStudioIdentity();

  const { data: created, error: createError } = await db
    .from("page_revisions")
    .insert({
      page_id: pageId,
      revision_number: nextNumber,
      state: "draft",
      source_revision_id: sourceRevisionId,
      created_by: identity?.userId ?? null,
    })
    .select("id")
    .single();

  if (createError) throw createError;

  if (sourceRevisionId) {
    const { data: source, error: sourceError } = await db
      .from("page_sections")
      .select("section_key, section_type, schema_version, position, enabled, payload")
      .eq("revision_id", sourceRevisionId)
      .order("position");

    if (sourceError) throw sourceError;

    if (source && source.length > 0) {
      const { error: copyError } = await db.from("page_sections").insert(
        source.map((s) => ({
          revision_id: created.id,
          section_key: s.section_key,
          section_type: s.section_type,
          schema_version: s.schema_version,
          position: s.position,
          enabled: s.enabled,
          payload: s.payload,
        })),
      );
      if (copyError) throw copyError;
    }
  }

  const { error: draftError } = await db
    .from("page_drafts")
    .insert({ page_id: pageId, revision_id: created.id });

  if (draftError) throw draftError;

  return created.id;
}

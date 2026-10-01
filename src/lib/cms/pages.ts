import "server-only";

import { getStudioIdentity } from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";
import { parseSection } from "@/lib/cms/registry";
import { PUBLIC_BUCKET } from "@/lib/studio/media-types";
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
  /** `storefront.content` pages can be started from empty; see startPageContentAction. */
  templateKey: string;
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
    // One-to-one (page_drafts.page_id is its primary key), so PostgREST embeds
    // a single object or null — never an array. See currentDraftId().
    const draft = p.page_drafts;
    return {
      id: p.id,
      pageKey: p.page_key,
      route: p.route,
      title: p.title,
      publishedRevisionId: p.published_revision_id,
      hasDraft: draft !== null,
      draftUpdatedAt: draft?.autosaved_at ?? null,
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

  await attachMediaUrls(sections);
  return { sections, rows };
}

/**
 * Give every media slot the URL of the asset it points at.
 *
 * Payloads store only `mediaAssetId`; the renderer needs `url`. Nothing filled
 * that in until the on-page editor work found it: an owner could pick a photo
 * for the hero, publish, and still see the placeholder, because `url` was
 * always undefined. Final photography could never have appeared.
 *
 * Resolution rules, deliberately narrow:
 *   - only the public bucket — the private bucket is never served to a page
 *   - archived assets resolve to nothing, so the slot shows its placeholder
 *     rather than an image the owner has retired
 *   - one query for the whole page, however many slots it has
 *
 * A failure here degrades to placeholders and is logged loudly; the page
 * still renders, because a missing photo is better than a missing page.
 */
async function attachMediaUrls(sections: Section[]): Promise<void> {
  const slots: { mediaAssetId: string | null; url?: string | null }[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if ("mediaAssetId" in record && "placeholderLabel" in record) {
        slots.push(record as { mediaAssetId: string | null; url?: string | null });
      }
      Object.values(record).forEach(visit);
    }
  };
  sections.forEach(visit);

  const ids = [...new Set(slots.map((s) => s.mediaAssetId).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return;

  const db = createAdminClient();
  const { data, error } = await db
    .from("media_assets")
    .select("id, bucket, storage_path")
    .in("id", ids)
    .eq("bucket", PUBLIC_BUCKET)
    .is("archived_at", null);

  if (error) {
    console.error("[bad-era] media lookup failed; rendering placeholders", error);
    return;
  }

  const urls = new Map(
    (data ?? []).map((asset) => [
      asset.id,
      db.storage.from(asset.bucket).getPublicUrl(asset.storage_path).data.publicUrl,
    ]),
  );
  for (const slot of slots) {
    slot.url = slot.mediaAssetId ? (urls.get(slot.mediaAssetId) ?? null) : null;
  }
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

async function readPageRow(pageKey: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("pages")
    .select("id, page_key, title, route, template_key, published_revision_id, page_drafts(revision_id)")
    .eq("page_key", pageKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

type PageRow = NonNullable<Awaited<ReturnType<typeof readPageRow>>>;

/**
 * The page's current draft revision, or null.
 *
 * `page_drafts` is one-to-one with `pages`, so PostgREST embeds it as a single
 * object. This used to be read as `page_drafts[0]`, which is always undefined
 * on an object: after the first draft existed, every load concluded there was
 * none and forked another, and the database refused the second pointer. The
 * owner saw it as the preview failing on their first session. The local type
 * generator hard-coded every relation as one-to-many, which is why the
 * typecheck did not catch it; it now matches Supabase's.
 */
function currentDraftId(page: PageRow): string | null {
  return page.page_drafts?.revision_id ?? null;
}

async function assembleDraft(page: PageRow, revisionId: string): Promise<PageDraft> {
  const db = createAdminClient();
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
    templateKey: page.template_key,
    revisionId,
    revisionNumber: revision.revision_number,
    sections,
    sectionRows: rows,
    publishedRevisionId: page.published_revision_id,
  };
}

/**
 * Get the working draft, creating one if none exists.
 *
 * A new draft is copied from the live revision so editing starts from what is
 * actually published, not from defaults.
 *
 * Creation is `ensure_page_draft` (migration 0016): one transaction behind a
 * row lock on the page, which re-checks for a draft under the lock and returns
 * it if one exists. It used to be four separate calls from here, so any caller
 * that wrongly believed there was no draft — the misread in currentDraftId(),
 * or two tabs opening a page at once — forked a rival revision and then died
 * on `page_drafts_pkey`, leaving the revision orphaned. Now the database is
 * the one place that decides, and it cannot be talked into a second draft.
 */
export async function getOrCreateDraft(pageKey: string): Promise<PageDraft | null> {
  const page = await readPageRow(pageKey);
  if (!page) return null;

  let revisionId = currentDraftId(page);

  if (!revisionId) {
    // Authorship is history, not authorization: this route is already
    // owner-gated, and a null here only costs the revision list a name.
    const identity = await getStudioIdentity();
    const { data, error } = await createAdminClient().rpc("ensure_page_draft", {
      p_page_id: page.id,
      p_actor: identity?.userId ?? null,
    });
    if (error) throw error;
    revisionId = data;
  }

  return assembleDraft(page, revisionId);
}

/**
 * The working draft if one exists, or null. Never writes.
 *
 * For the preview frame. A preview is a read: it must not create revisions as
 * a side effect, and it is loaded by the editor page that has already ensured
 * the draft exists.
 */
export async function getExistingDraft(pageKey: string): Promise<PageDraft | null> {
  const page = await readPageRow(pageKey);
  if (!page) return null;

  const revisionId = currentDraftId(page);
  if (!revisionId) return null;

  return assembleDraft(page, revisionId);
}

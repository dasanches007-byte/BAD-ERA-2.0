import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import { parseSection } from "@/lib/cms/registry";
import type { Json } from "@/lib/db/generated.types";

/**
 * Shared publishing internals (Master Spec §13).
 *
 * These helpers deliberately live OUTSIDE the `"use server"` modules. Every
 * exported async function in a `"use server"` file becomes a browser-callable
 * endpoint, so an un-authorized helper exported from one is a hole in the
 * boundary: `commitPagePublish` would let anyone with the page and revision ids
 * move the live pointer.
 *
 * Here they are `server-only` instead — importable by Server Actions, not
 * reachable from the network, and a build failure if a Client Component ever
 * touches them. Authorization stays where it belongs: in the actions.
 */

/**
 * Validate every section of a revision against the registry.
 *
 * Returns the offending section key, or null when the whole revision is
 * publishable. Callers run this BEFORE any write, so a revision that would
 * render badly never reaches live (Master Spec §11.4.5).
 *
 * Shared by the single-page and publish-set flows; the set flow must validate
 * every page before publishing any of them.
 */
export async function validateRevisionForPublish(
  revisionId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = createAdminClient();

  const { data: sections, error } = await db
    .from("page_sections")
    .select("section_key, section_type, schema_version, enabled, payload")
    .eq("revision_id", revisionId);

  if (error) return { ok: false, message: error.message };
  if (!sections || sections.length === 0) {
    return { ok: false, message: "This draft has no sections to publish." };
  }

  for (const row of sections) {
    const parsed = parseSection({
      ...(row.payload as Record<string, unknown>),
      type: row.section_type,
      sectionId: row.section_key,
      enabled: row.enabled,
      schemaVersion: row.schema_version,
    });
    if (!parsed.success) {
      return {
        ok: false,
        message: `Section "${row.section_key}" is not valid, so nothing was published.`,
      };
    }
  }

  return { ok: true };
}

/**
 * Move one page's live pointer onto an already-validated draft revision.
 *
 * Three writes in sequence, in the only order that is safe if the process dies
 * between them:
 *
 *   1. flip the revision draft -> published   (live still points at the old one)
 *   2. move pages.published_revision_id       (the actual go-live moment)
 *   3. clear the draft pointer                (next edit starts a fresh revision)
 *
 * Interrupted after 1, live is unchanged and the orphaned revision is inert.
 * Interrupted after 2, the new content is live and the stale draft pointer is
 * corrected on the next publish. There is no ordering that leaves live pointing
 * at a revision that was never validated.
 *
 * It does NOT write audit or revalidate — the caller owns those, because a
 * publish set writes one audit row for the whole set.
 */
export async function commitPagePublish(input: {
  pageId: string;
  revisionId: string;
  note?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = createAdminClient();
  const publishedAt = new Date().toISOString();

  // The immutability trigger only fires on rows that are ALREADY published, so
  // this transition is allowed exactly once.
  const { error: stateError } = await db
    .from("page_revisions")
    .update({
      state: "published",
      published_at: publishedAt,
      note: input.note?.trim() || null,
    })
    .eq("id", input.revisionId);

  if (stateError) return { ok: false, message: stateError.message };

  const { error: pointerError } = await db
    .from("pages")
    .update({ published_revision_id: input.revisionId })
    .eq("id", input.pageId);

  if (pointerError) return { ok: false, message: pointerError.message };

  await db.from("page_drafts").delete().eq("page_id", input.pageId);

  return { ok: true };
}

/**
 * Record a publish set and the pages it is about to move.
 *
 * EVERY change to live goes through here — a single page published from the
 * Site Editor, a multi-page publish, and a rollback alike. A "publish history"
 * that omitted single-page publishes would be a history the owner cannot trust,
 * and a rollback that left no entry would be a change to live with no record.
 *
 * The set is created `prepared`. The caller marks it `published` or `failed`
 * once the pointers have actually moved, so a set that never went live is never
 * recorded as though it did.
 */
export async function recordPublishSet(input: {
  actorUserId: string;
  note: string | null;
  items: {
    pageId: string;
    revisionId: string;
    previousRevisionId: string | null;
  }[];
}): Promise<{ ok: true; publishSetId: string } | { ok: false; message: string }> {
  const db = createAdminClient();

  const { data: set, error: setError } = await db
    .from("publish_sets")
    .insert({
      status: "prepared",
      note: input.note?.trim() || null,
      created_by: input.actorUserId,
    })
    .select("id")
    .single();

  if (setError) return { ok: false, message: setError.message };

  const { error: itemsError } = await db.from("publish_set_items").insert(
    input.items.map((item) => ({
      publish_set_id: set.id,
      page_id: item.pageId,
      revision_id: item.revisionId,
      // Where this page pointed BEFORE. The only reason the set is reversible.
      previous_revision_id: item.previousRevisionId,
    })),
  );

  if (itemsError) {
    await markPublishSet(set.id, "failed");
    return { ok: false, message: itemsError.message };
  }

  return { ok: true, publishSetId: set.id };
}

/**
 * Move a publish set to its terminal status.
 *
 * Never throws. By the time this runs the pages are already live (or already
 * known not to be); failing the caller over the set's own bookkeeping would
 * tell the owner to republish content that already went out.
 */
export async function markPublishSet(
  publishSetId: string,
  status: "published" | "failed" | "rolled_back",
): Promise<void> {
  const db = createAdminClient();

  const patch: {
    status: typeof status;
    published_at?: string;
    failed_at?: string;
  } = { status };
  const now = new Date().toISOString();
  if (status === "published") patch.published_at = now;
  if (status === "failed") patch.failed_at = now;

  const { error } = await db.from("publish_sets").update(patch).eq("id", publishSetId);
  if (error) {
    console.error("[bad-era] publish set status update failed", { status, error });
  }
}

/** The revision a page is serving right now, or null if it has never published. */
export async function currentLiveRevisionId(
  pageId: string,
): Promise<string | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("pages")
    .select("published_revision_id")
    .eq("id", pageId)
    .maybeSingle();

  if (error) throw error;
  return data?.published_revision_id ?? null;
}

/**
 * Copy a revision's sections into a new draft revision.
 *
 * Shared by rollback and by the publish-set rollback. Returns the new revision
 * id, which is always a DRAFT — the caller decides whether to publish it.
 */
export async function forkRevisionToDraft(input: {
  pageId: string;
  sourceRevisionId: string;
  actorUserId: string;
  note: string;
}): Promise<{ ok: true; revisionId: string } | { ok: false; message: string }> {
  const db = createAdminClient();

  const { data: last, error: lastError } = await db
    .from("page_revisions")
    .select("revision_number")
    .eq("page_id", input.pageId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) return { ok: false, message: lastError.message };

  const { data: created, error: createError } = await db
    .from("page_revisions")
    .insert({
      page_id: input.pageId,
      revision_number: (last?.revision_number ?? 0) + 1,
      state: "draft",
      source_revision_id: input.sourceRevisionId,
      created_by: input.actorUserId,
      note: input.note,
    })
    .select("id")
    .single();

  if (createError) return { ok: false, message: createError.message };

  const { data: source, error: sourceError } = await db
    .from("page_sections")
    .select("section_key, section_type, schema_version, position, enabled, payload")
    .eq("revision_id", input.sourceRevisionId)
    .order("position");

  if (sourceError) return { ok: false, message: sourceError.message };
  if (!source || source.length === 0) {
    return { ok: false, message: "That revision has no sections." };
  }

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

  if (copyError) return { ok: false, message: copyError.message };

  return { ok: true, revisionId: created.id };
}

/**
 * Append one publishing audit row.
 *
 * Audit writes never fail a publish. The content is already live at this point;
 * throwing here would report failure for work that succeeded, which is worse
 * than a gap in the trail. The failure is logged loudly instead.
 */
export async function writePublishAudit(input: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("audit_events").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata as Json,
  });

  if (error) {
    console.error("[bad-era] audit write failed", { action: input.action, error });
  }
}

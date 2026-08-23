"use server";

import { revalidatePath } from "next/cache";

import { requireStudioOwner, StudioAuthorizationError } from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";
import {
  commitPagePublish,
  currentLiveRevisionId,
  forkRevisionToDraft,
  markPublishSet,
  recordPublishSet,
  validateRevisionForPublish,
  writePublishAudit,
} from "@/lib/cms/publish-core";
import { parseSection } from "@/lib/cms/registry";
import type { Json } from "@/lib/db/generated.types";

/**
 * Site Editor mutations (Master Spec §11.4.5, §13).
 *
 * Every write validates the payload against the registry FIRST. That is the
 * guardrail: content reaches the database only in a shape the renderer already
 * understands, so no field can smuggle CSS, markup or a script onto a page.
 *
 * Publishing never edits live content. It flips the draft revision to
 * published and moves the live pointer, so a failed publish leaves the previous
 * revision serving traffic untouched.
 */

export type EditorResult =
  | { ok: true; version?: number }
  | { ok: false; message: string; conflict?: true };

type OwnerCheck =
  | { ok: true; userId: string }
  | { ok: false; message: string };

/**
 * Resolve the acting owner, and hand back their id.
 *
 * The id matters: every publishing mutation writes an `audit_events` row, and
 * an audit trail that cannot name the actor is not an audit trail
 * (Master Spec §13.4).
 */
async function assertOwner(): Promise<OwnerCheck> {
  try {
    const identity = await requireStudioOwner();
    return { ok: true, userId: identity.userId };
  } catch (error) {
    if (error instanceof StudioAuthorizationError) {
      return { ok: false, message: "Studio authorization required." };
    }
    throw error;
  }
}

/**
 * Autosave one section's payload into the draft revision.
 *
 * Refuses if the target revision is not a draft — belt and braces alongside the
 * database trigger that already rejects edits to published revisions.
 *
 * OPTIMISTIC CONCURRENCY (Master Spec §13.2): the caller passes the `version`
 * it last read. A trigger increments that counter on every write, so the update
 * only lands if nobody else has saved since — a stale tab is told its copy is
 * out of date rather than silently overwriting newer edits.
 *
 * A counter rather than `updated_at`: `now()` is transaction start time, so two
 * writes inside one transaction share a timestamp, and microsecond resolution
 * makes near-simultaneous writes indistinguishable. Verified against the live
 * database — the timestamp guard let a stale write through, the counter did not.
 */
export async function saveSectionAction(input: {
  revisionId: string;
  sectionKey: string;
  payload: unknown;
  expectedVersion?: number;
}): Promise<EditorResult> {
  const auth = await assertOwner();
  if (!auth.ok) return { ok: false, message: auth.message };

  const parsed = parseSection(input.payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      message: issue
        ? `${issue.path.join(".") || "Section"}: ${issue.message}`
        : "That content is not valid for this section.",
    };
  }

  const db = createAdminClient();

  const { data: revision, error: revError } = await db
    .from("page_revisions")
    .select("id, state, page_id")
    .eq("id", input.revisionId)
    .maybeSingle();

  if (revError) return { ok: false, message: revError.message };
  if (!revision) return { ok: false, message: "That draft no longer exists." };
  if (revision.state !== "draft") {
    return { ok: false, message: "That revision is published and cannot be edited." };
  }

  const section = parsed.data;
  // sectionId / type / enabled / schemaVersion live in their own columns, so
  // they are stripped from the stored payload to keep one source of truth.
  const { sectionId: _sectionId, type: _type, enabled, schemaVersion, ...payload } =
    section as Record<string, unknown> & {
      sectionId: string;
      type: string;
      enabled: boolean;
      schemaVersion: number;
    };
  void _sectionId;
  void _type;

  let update = db
    .from("page_sections")
    // The payload came through the registry schema, so its shape is known and
    // JSON-serialisable; the cast satisfies the generated Json type.
    .update({ payload: payload as Json, enabled, schema_version: schemaVersion })
    .eq("revision_id", input.revisionId)
    .eq("section_key", input.sectionKey);

  // Only apply the version guard when the caller supplied a token, so a first
  // save from a freshly created draft is not blocked.
  if (input.expectedVersion !== undefined) {
    update = update.eq("version", input.expectedVersion);
  }

  const { data: updated, error } = await update.select("version");

  if (error) return { ok: false, message: error.message };

  if (input.expectedVersion !== undefined && (!updated || updated.length === 0)) {
    // The row moved on. Refusing is the point: silently winning here is how a
    // stale tab erases someone else's work.
    return {
      ok: false,
      conflict: true,
      message:
        "This section changed somewhere else. Reload to get the latest version before editing.",
    };
  }

  await db
    .from("page_drafts")
    .update({ autosaved_at: new Date().toISOString() })
    .eq("revision_id", input.revisionId);

  // Hand back the new token so the editor can keep saving without a reload.
  return { ok: true, version: updated?.[0]?.version };
}

/** Toggle a section's visibility without deleting it. */
export async function setSectionEnabledAction(input: {
  revisionId: string;
  sectionKey: string;
  enabled: boolean;
}): Promise<EditorResult> {
  const auth = await assertOwner();
  if (!auth.ok) return { ok: false, message: auth.message };

  const db = createAdminClient();
  const { error } = await db
    .from("page_sections")
    .update({ enabled: input.enabled })
    .eq("revision_id", input.revisionId)
    .eq("section_key", input.sectionKey);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Reorder sections within the draft. */
export async function reorderSectionsAction(input: {
  revisionId: string;
  orderedSectionKeys: string[];
}): Promise<EditorResult> {
  const auth = await assertOwner();
  if (!auth.ok) return { ok: false, message: auth.message };

  const db = createAdminClient();

  for (const [index, key] of input.orderedSectionKeys.entries()) {
    const { error } = await db
      .from("page_sections")
      .update({ position: index })
      .eq("revision_id", input.revisionId)
      .eq("section_key", key);
    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

/**
 * Publish one page's draft.
 *
 * Validates every section before touching anything. If validation fails, live
 * stays exactly where it was (Master Spec §11.4.5: "If publish validation or
 * persistence fails, live remains untouched").
 */
export async function publishPageAction(input: {
  pageId: string;
  revisionId: string;
  note?: string;
}): Promise<EditorResult> {
  const auth = await assertOwner();
  if (!auth.ok) return { ok: false, message: auth.message };

  const valid = await validateRevisionForPublish(input.revisionId);
  if (!valid.ok) return valid;

  // A single-page publish is still a publish set, of one. Otherwise the Site
  // Editor's own publish button would leave no entry in publish history, and
  // the one change the owner most often makes would be the one they cannot see
  // or roll back.
  const previousRevisionId = await currentLiveRevisionId(input.pageId);
  const set = await recordPublishSet({
    actorUserId: auth.userId,
    note: input.note ?? null,
    items: [
      {
        pageId: input.pageId,
        revisionId: input.revisionId,
        previousRevisionId,
      },
    ],
  });
  if (!set.ok) return set;

  const committed = await commitPagePublish({
    pageId: input.pageId,
    revisionId: input.revisionId,
    note: input.note,
  });
  if (!committed.ok) {
    await markPublishSet(set.publishSetId, "failed");
    return committed;
  }

  await markPublishSet(set.publishSetId, "published");

  await writePublishAudit({
    actorUserId: auth.userId,
    action: "page.publish",
    entityType: "page",
    entityId: input.pageId,
    metadata: {
      revision_id: input.revisionId,
      publish_set_id: set.publishSetId,
      note: input.note ?? null,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/studio/site");
  revalidatePath("/studio/publishing");

  return { ok: true };
}

/**
 * Roll back to an earlier revision.
 *
 * Republishes it as a NEW revision rather than moving the pointer backwards, so
 * later history is preserved and the rollback itself is auditable
 * (Master Spec §13.1).
 */
export async function rollbackPageAction(input: {
  pageId: string;
  targetRevisionId: string;
}): Promise<EditorResult> {
  const auth = await assertOwner();
  if (!auth.ok) return { ok: false, message: auth.message };

  const db = createAdminClient();

  const { data: target, error: targetError } = await db
    .from("page_revisions")
    .select("id, page_id, revision_number")
    .eq("id", input.targetRevisionId)
    .maybeSingle();

  if (targetError) return { ok: false, message: targetError.message };
  if (!target) return { ok: false, message: "That revision no longer exists." };
  // A revision id from another page would republish the wrong content under
  // this page's pointer, so the ownership check is not optional.
  if (target.page_id !== input.pageId) {
    return { ok: false, message: "That revision does not belong to this page." };
  }

  const note = `Rollback to revision ${target.revision_number}`;

  const forked = await forkRevisionToDraft({
    pageId: input.pageId,
    sourceRevisionId: input.targetRevisionId,
    actorUserId: auth.userId,
    note,
  });
  if (!forked.ok) return forked;

  // Drop any in-flight draft, then publish the restored content. The owner's
  // unpublished edits are not erased — they stay as their own revision in
  // history, only unpointed.
  await db.from("page_drafts").delete().eq("page_id", input.pageId);

  const valid = await validateRevisionForPublish(forked.revisionId);
  if (!valid.ok) return valid;

  // A rollback changes what the public sees, so it belongs in publish history
  // like any other publish — and recording the revision it replaced means the
  // rollback is itself reversible.
  const previousRevisionId = await currentLiveRevisionId(input.pageId);
  const set = await recordPublishSet({
    actorUserId: auth.userId,
    note,
    items: [
      { pageId: input.pageId, revisionId: forked.revisionId, previousRevisionId },
    ],
  });
  if (!set.ok) return set;

  const committed = await commitPagePublish({
    pageId: input.pageId,
    revisionId: forked.revisionId,
    note,
  });
  if (!committed.ok) {
    await markPublishSet(set.publishSetId, "failed");
    return committed;
  }

  await markPublishSet(set.publishSetId, "published");

  await writePublishAudit({
    actorUserId: auth.userId,
    action: "page.rollback",
    entityType: "page",
    entityId: input.pageId,
    metadata: {
      restored_revision_id: input.targetRevisionId,
      restored_revision_number: target.revision_number,
      new_revision_id: forked.revisionId,
      publish_set_id: set.publishSetId,
      reason: note,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/studio/site");
  revalidatePath("/studio/publishing");

  return { ok: true };
}

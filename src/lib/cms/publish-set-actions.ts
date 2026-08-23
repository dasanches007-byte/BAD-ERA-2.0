"use server";

import { revalidatePath } from "next/cache";

import { requireStudioOwner, StudioAuthorizationError } from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";
import {
  commitPagePublish,
  forkRevisionToDraft,
  markPublishSet,
  recordPublishSet,
  validateRevisionForPublish,
  writePublishAudit,
} from "@/lib/cms/publish-core";

/**
 * Publish sets — publishing several pages as one recorded operation
 * (Master Spec §13.3).
 *
 * A set exists so that "I published the site on Tuesday" is a single thing the
 * owner can see, audit and undo, rather than five unrelated page publishes they
 * have to reconstruct from timestamps.
 *
 * `publish_set_items.previous_revision_id` is what makes it reversible: for
 * every page in the set it records where that page pointed BEFORE the set went
 * live, so rollback has a concrete target per page instead of a guess.
 */

export type PublishSetResult =
  | { ok: true; publishSetId: string; publishedPageKeys: string[] }
  | {
      ok: false;
      message: string;
      /** Pages that DID go live before the failure. Never hidden. */
      publishedPageKeys?: string[];
      publishSetId?: string;
    };

type OwnerCheck = { ok: true; userId: string } | { ok: false; message: string };

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
 * Publish the pending drafts of several pages as one set.
 *
 * Order of operations, and why:
 *
 *   1. resolve each page's draft and its current live revision
 *   2. VALIDATE every page's draft — all of them, before any write
 *   3. record the set and its items (including where each page pointed before)
 *   4. move each page's live pointer
 *
 * Step 2 covering the whole set before step 4 touches anything is the point: a
 * set that would put an invalid page live publishes nothing at all, so the
 * owner never gets half a site update.
 *
 * PostgREST gives no cross-statement transaction, so step 4 is not atomic
 * across pages. Validating first removes the realistic failure modes, and if a
 * write still fails mid-set this returns exactly which pages went live and
 * which did not, and leaves the set marked `failed` with its items recorded.
 * Claiming a rollback that did not happen would be worse than saying so.
 */
export async function publishPagesAction(input: {
  pageIds: string[];
  note?: string;
}): Promise<PublishSetResult> {
  const auth = await assertOwner();
  if (!auth.ok) return { ok: false, message: auth.message };

  if (input.pageIds.length === 0) {
    return { ok: false, message: "Select at least one page to publish." };
  }

  const db = createAdminClient();
  const note = input.note?.trim() || null;

  const [{ data: pages, error: pagesError }, { data: drafts, error: draftsError }] =
    await Promise.all([
      db
        .from("pages")
        .select("id, page_key, title, published_revision_id")
        .in("id", input.pageIds),
      db.from("page_drafts").select("page_id, revision_id").in("page_id", input.pageIds),
    ]);

  if (pagesError) return { ok: false, message: pagesError.message };
  if (draftsError) return { ok: false, message: draftsError.message };

  const draftByPage = new Map((drafts ?? []).map((d) => [d.page_id, d.revision_id]));

  const targets: {
    pageId: string;
    pageKey: string;
    title: string;
    revisionId: string;
    previousRevisionId: string | null;
  }[] = [];

  for (const page of pages ?? []) {
    const revisionId = draftByPage.get(page.id);
    if (!revisionId) {
      return {
        ok: false,
        message: `“${page.title}” has no unpublished draft, so nothing was published.`,
      };
    }
    targets.push({
      pageId: page.id,
      pageKey: page.page_key,
      title: page.title,
      revisionId,
      previousRevisionId: page.published_revision_id,
    });
  }

  if (targets.length !== input.pageIds.length) {
    return { ok: false, message: "One of those pages no longer exists." };
  }

  // 2. Validate the WHOLE set before writing anything.
  for (const target of targets) {
    const valid = await validateRevisionForPublish(target.revisionId);
    if (!valid.ok) {
      return {
        ok: false,
        message: `“${target.title}” could not be validated: ${valid.message} Nothing was published.`,
      };
    }
  }

  // 3. Record the set and exactly what it is about to move.
  const set = await recordPublishSet({
    actorUserId: auth.userId,
    note,
    items: targets.map((t) => ({
      pageId: t.pageId,
      revisionId: t.revisionId,
      previousRevisionId: t.previousRevisionId,
    })),
  });

  if (!set.ok) return { ok: false, message: set.message };

  // 4. Go live, page by page.
  const publishedPageKeys: string[] = [];
  for (const target of targets) {
    const committed = await commitPagePublish({
      pageId: target.pageId,
      revisionId: target.revisionId,
      note,
    });

    if (!committed.ok) {
      await markPublishSet(set.publishSetId, "failed");
      await writePublishAudit({
        actorUserId: auth.userId,
        action: "publish_set.failed",
        entityType: "publish_set",
        entityId: set.publishSetId,
        metadata: {
          page_count: targets.length,
          published_page_keys: publishedPageKeys,
          failed_page_key: target.pageKey,
          reason: committed.message,
          note,
        },
      });
      revalidatePath("/", "layout");
      revalidatePath("/studio/publishing");
      return {
        ok: false,
        message:
          publishedPageKeys.length === 0
            ? `“${target.title}” failed to publish: ${committed.message} Nothing went live.`
            : `“${target.title}” failed to publish: ${committed.message} ${publishedPageKeys.length} earlier ${publishedPageKeys.length === 1 ? "page is" : "pages are"} already live — roll this set back to undo them.`,
        publishedPageKeys,
        publishSetId: set.publishSetId,
      };
    }

    publishedPageKeys.push(target.pageKey);
  }

  await markPublishSet(set.publishSetId, "published");

  await writePublishAudit({
    actorUserId: auth.userId,
    action: "publish_set.publish",
    entityType: "publish_set",
    entityId: set.publishSetId,
    metadata: { page_count: targets.length, page_keys: publishedPageKeys, note },
  });

  revalidatePath("/", "layout");
  revalidatePath("/studio/site");
  revalidatePath("/studio/publishing");

  return { ok: true, publishSetId: set.publishSetId, publishedPageKeys };
}

/**
 * Roll a published set back.
 *
 * Every page in the set is restored to the revision it pointed at before the
 * set, republished as a NEW revision. History is append-only, so rolling back
 * and then rolling forward again both stay visible (Master Spec §13.1).
 *
 * A page that had never published before the set is reported as skipped rather
 * than silently left alone: there is no earlier revision to restore, and
 * un-publishing a live page is a different decision the owner has not made.
 */
export async function rollbackPublishSetAction(input: {
  publishSetId: string;
}): Promise<
  | { ok: true; restoredPageKeys: string[]; skippedPageKeys: string[] }
  | { ok: false; message: string }
> {
  const auth = await assertOwner();
  if (!auth.ok) return { ok: false, message: auth.message };

  const db = createAdminClient();

  const { data: set, error: setError } = await db
    .from("publish_sets")
    .select("id, status")
    .eq("id", input.publishSetId)
    .maybeSingle();

  if (setError) return { ok: false, message: setError.message };
  if (!set) return { ok: false, message: "That publish set no longer exists." };
  if (set.status === "rolled_back") {
    return { ok: false, message: "That set has already been rolled back." };
  }
  if (set.status === "prepared") {
    return { ok: false, message: "That set never went live, so there is nothing to undo." };
  }

  const { data: items, error: itemsError } = await db
    .from("publish_set_items")
    .select("page_id, revision_id, previous_revision_id")
    .eq("publish_set_id", input.publishSetId);

  if (itemsError) return { ok: false, message: itemsError.message };
  if (!items || items.length === 0) {
    return { ok: false, message: "That set recorded no pages." };
  }

  const pageIds = items.map((i) => i.page_id);
  const { data: pages, error: pagesError } = await db
    .from("pages")
    .select("id, page_key, published_revision_id")
    .in("id", pageIds);

  if (pagesError) return { ok: false, message: pagesError.message };
  const pageById = new Map((pages ?? []).map((p) => [p.id, p]));

  const restoredPageKeys: string[] = [];
  const skippedPageKeys: string[] = [];
  const restorations: {
    pageId: string;
    revisionId: string;
    previousRevisionId: string | null;
  }[] = [];

  for (const item of items) {
    const page = pageById.get(item.page_id);
    if (!page) continue;

    if (!item.previous_revision_id) {
      // First publish for this page — nothing to go back to.
      skippedPageKeys.push(page.page_key);
      continue;
    }

    // If the page has moved on since the set, this set is no longer what is
    // live there. Undoing it would overwrite newer work the owner did after.
    if (page.published_revision_id !== item.revision_id) {
      skippedPageKeys.push(page.page_key);
      continue;
    }

    const forked = await forkRevisionToDraft({
      pageId: item.page_id,
      sourceRevisionId: item.previous_revision_id,
      actorUserId: auth.userId,
      note: "Publish set rollback",
    });
    if (!forked.ok) return { ok: false, message: forked.message };

    const valid = await validateRevisionForPublish(forked.revisionId);
    if (!valid.ok) return { ok: false, message: valid.message };

    await db.from("page_drafts").delete().eq("page_id", item.page_id);

    const committed = await commitPagePublish({
      pageId: item.page_id,
      revisionId: forked.revisionId,
      note: "Publish set rollback",
    });
    if (!committed.ok) return { ok: false, message: committed.message };

    restorations.push({
      pageId: item.page_id,
      revisionId: forked.revisionId,
      // What this page was serving immediately before the rollback — the set
      // being undone put it there.
      previousRevisionId: item.revision_id,
    });
    restoredPageKeys.push(page.page_key);
  }

  await markPublishSet(input.publishSetId, "rolled_back");

  // The restoration is itself a change to live, so it gets its own set. Rolling
  // that one back is "roll forward again", and both stay in history.
  if (restorations.length > 0) {
    const restoreSet = await recordPublishSet({
      actorUserId: auth.userId,
      note: "Publish set rollback",
      items: restorations,
    });
    if (restoreSet.ok) await markPublishSet(restoreSet.publishSetId, "published");
  }

  await writePublishAudit({
    actorUserId: auth.userId,
    action: "publish_set.rollback",
    entityType: "publish_set",
    entityId: input.publishSetId,
    metadata: {
      page_count: restoredPageKeys.length,
      page_keys: restoredPageKeys,
      skipped_page_keys: skippedPageKeys,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/studio/site");
  revalidatePath("/studio/publishing");

  return { ok: true, restoredPageKeys, skippedPageKeys };
}

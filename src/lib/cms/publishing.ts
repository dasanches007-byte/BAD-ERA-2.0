import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type {
  AuditEventRow,
  PublishSetItemRow,
  PublishSetRow,
  PublishingPage,
  RevisionRow,
} from "@/lib/cms/publishing-types";

/**
 * Publishing reads (Master Spec §13).
 *
 * Everything here is history: what is live, what is waiting, what went live
 * before, and who did it. Nothing in this module mutates — publishing itself
 * lives in `page-actions.ts` and `publish-set-actions.ts`.
 *
 * These reads run on the service-role client, which bypasses RLS, so each
 * query lists its columns explicitly. `audit_events` in particular can carry
 * arbitrary `before_state` / `after_state` blobs from any subsystem; this
 * module never selects them, and flattens only the few metadata keys the
 * publishing trail actually needs.
 */

/** Look up display names for a set of actor ids in one round trip. */
async function resolveActorNames(
  ids: (string | null)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();

  const db = createAdminClient();
  const { data, error } = await db
    .from("studio_users")
    .select("user_id, display_name")
    .in("user_id", unique);

  // A missing name is cosmetic — never fail a history read over it.
  if (error) {
    console.error("[bad-era] actor name lookup failed", error);
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.display_name) map.set(row.user_id, row.display_name);
  }
  return map;
}

/** Count sections per revision for a set of revision ids. */
async function countSections(
  revisionIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (revisionIds.length === 0) return counts;

  const db = createAdminClient();
  const { data, error } = await db
    .from("page_sections")
    .select("revision_id")
    .in("revision_id", revisionIds);

  if (error) throw error;

  for (const row of data ?? []) {
    counts.set(row.revision_id, (counts.get(row.revision_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Every editable page with its live revision and its pending draft.
 *
 * This is the publish queue. The owner sees, per page, exactly what is serving
 * traffic and exactly what would replace it.
 */
export async function listPublishingPages(): Promise<PublishingPage[]> {
  const db = createAdminClient();

  const [{ data: pages, error: pagesError }, { data: drafts, error: draftsError }] =
    await Promise.all([
      db
        .from("pages")
        .select("id, page_key, title, route, published_revision_id")
        .order("page_key"),
      db.from("page_drafts").select("page_id, revision_id, autosaved_at"),
    ]);

  if (pagesError) throw pagesError;
  if (draftsError) throw draftsError;

  const draftByPage = new Map(
    (drafts ?? []).map((d) => [d.page_id, d] as const),
  );

  const revisionIds = [
    ...(pages ?? [])
      .map((p) => p.published_revision_id)
      .filter((id): id is string => Boolean(id)),
    ...(drafts ?? []).map((d) => d.revision_id),
  ];

  const revisions = await readRevisionsByIds(revisionIds);
  const sectionCounts = await countSections(
    (drafts ?? []).map((d) => d.revision_id),
  );

  return (pages ?? []).map((page) => {
    const liveRevision = page.published_revision_id
      ? revisions.get(page.published_revision_id)
      : undefined;
    const draft = draftByPage.get(page.id);
    const draftRevision = draft ? revisions.get(draft.revision_id) : undefined;

    return {
      pageId: page.id,
      pageKey: page.page_key,
      title: page.title,
      route: page.route,
      live: liveRevision
        ? {
            revisionId: liveRevision.id,
            revisionNumber: liveRevision.revision_number,
            publishedAt: liveRevision.published_at,
            note: liveRevision.note,
          }
        : null,
      draft:
        draft && draftRevision
          ? {
              revisionId: draft.revision_id,
              revisionNumber: draftRevision.revision_number,
              autosavedAt: draft.autosaved_at,
              sectionCount: sectionCounts.get(draft.revision_id) ?? 0,
            }
          : null,
    };
  });
}

type RawRevision = {
  id: string;
  page_id: string;
  revision_number: number;
  state: "draft" | "published" | "archived";
  created_at: string;
  published_at: string | null;
  note: string | null;
  source_revision_id: string | null;
};

async function readRevisionsByIds(
  ids: string[],
): Promise<Map<string, RawRevision>> {
  const map = new Map<string, RawRevision>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return map;

  const db = createAdminClient();
  const { data, error } = await db
    .from("page_revisions")
    .select(
      "id, page_id, revision_number, state, created_at, published_at, note, source_revision_id",
    )
    .in("id", unique);

  if (error) throw error;
  for (const row of data ?? []) map.set(row.id, row as RawRevision);
  return map;
}

/**
 * Full revision history for one page, newest first.
 *
 * History is append-only: a rollback adds a revision rather than removing the
 * ones after it, so this list only ever grows (Master Spec §13.1).
 */
export async function listPageRevisions(pageId: string): Promise<RevisionRow[]> {
  const db = createAdminClient();

  const [{ data: page, error: pageError }, { data, error }] = await Promise.all([
    db.from("pages").select("published_revision_id").eq("id", pageId).single(),
    db
      .from("page_revisions")
      .select(
        "id, revision_number, state, created_at, published_at, note, source_revision_id",
      )
      .eq("page_id", pageId)
      .order("revision_number", { ascending: false })
      .limit(50),
  ]);

  if (pageError) throw pageError;
  if (error) throw error;

  const counts = await countSections((data ?? []).map((r) => r.id));

  return (data ?? []).map((r) => ({
    id: r.id,
    revisionNumber: r.revision_number,
    state: r.state,
    createdAt: r.created_at,
    publishedAt: r.published_at,
    note: r.note,
    sourceRevisionId: r.source_revision_id,
    sectionCount: counts.get(r.id) ?? 0,
    isLive: r.id === page?.published_revision_id,
  }));
}

/**
 * Publish sets, newest first, with the pages each one moved.
 *
 * `publish_set_items.previous_revision_id` is what makes a set reversible: it
 * records where every page was before the set went live, so a rollback has a
 * concrete target per page rather than a guess.
 *
 * Deliberately four small queries joined in TypeScript rather than a nested
 * PostgREST embed: `publish_set_items` has two foreign keys to
 * `page_revisions`, so an embed would need constraint-name hints and would
 * break the moment a constraint is renamed.
 */
export async function listPublishSets(limit = 25): Promise<PublishSetRow[]> {
  const db = createAdminClient();

  const { data: sets, error: setsError } = await db
    .from("publish_sets")
    .select("id, status, note, created_by, created_at, published_at, failed_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (setsError) throw setsError;
  if (!sets || sets.length === 0) return [];

  const { data: items, error: itemsError } = await db
    .from("publish_set_items")
    .select("publish_set_id, page_id, revision_id, previous_revision_id")
    .in(
      "publish_set_id",
      sets.map((s) => s.id),
    );

  if (itemsError) throw itemsError;

  const revisions = await readRevisionsByIds([
    ...(items ?? []).map((i) => i.revision_id),
    ...(items ?? [])
      .map((i) => i.previous_revision_id)
      .filter((id): id is string => Boolean(id)),
  ]);

  const pageIds = [...new Set((items ?? []).map((i) => i.page_id))];
  const pageById = new Map<string, { page_key: string; title: string }>();
  if (pageIds.length > 0) {
    const { data: pages, error: pagesError } = await db
      .from("pages")
      .select("id, page_key, title")
      .in("id", pageIds);
    if (pagesError) throw pagesError;
    for (const p of pages ?? []) {
      pageById.set(p.id, { page_key: p.page_key, title: p.title });
    }
  }

  const actors = await resolveActorNames(sets.map((s) => s.created_by));

  const itemsBySet = new Map<string, PublishSetItemRow[]>();
  for (const item of items ?? []) {
    const page = pageById.get(item.page_id);
    const row: PublishSetItemRow = {
      pageId: item.page_id,
      pageKey: page?.page_key ?? item.page_id,
      pageTitle: page?.title ?? "Unknown page",
      revisionNumber: revisions.get(item.revision_id)?.revision_number ?? null,
      previousRevisionNumber: item.previous_revision_id
        ? (revisions.get(item.previous_revision_id)?.revision_number ?? null)
        : null,
    };
    const list = itemsBySet.get(item.publish_set_id);
    if (list) list.push(row);
    else itemsBySet.set(item.publish_set_id, [row]);
  }

  return sets.map((s) => ({
    id: s.id,
    status: s.status,
    note: s.note,
    createdAt: s.created_at,
    publishedAt: s.published_at,
    failedAt: s.failed_at,
    actorName: s.created_by ? (actors.get(s.created_by) ?? null) : null,
    items: (itemsBySet.get(s.id) ?? []).sort((a, b) =>
      a.pageKey.localeCompare(b.pageKey),
    ),
  }));
}

/** Publishing actions this audit view understands. */
const PUBLISHING_ACTIONS = [
  "page.publish",
  "page.rollback",
  "publish_set.publish",
  "publish_set.failed",
  "publish_set.rollback",
];

/**
 * The publishing audit trail.
 *
 * Scoped to publishing actions on purpose: `audit_events` is shared with
 * inventory, refunds and fulfillment, and a console that mixes "stock adjusted"
 * into "site published" is one the owner stops reading.
 */
export async function listPublishingAudit(limit = 40): Promise<AuditEventRow[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("audit_events")
    .select("id, actor_user_id, action, entity_type, entity_id, metadata, created_at")
    .in("action", PUBLISHING_ACTIONS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const actors = await resolveActorNames(
    (data ?? []).map((e) => e.actor_user_id),
  );

  return (data ?? []).map((e) => {
    const metadata = (e.metadata ?? {}) as Record<string, unknown>;
    const parts: string[] = [];

    if (typeof metadata.page_key === "string") parts.push(metadata.page_key);
    if (typeof metadata.page_count === "number") {
      parts.push(
        `${metadata.page_count} ${metadata.page_count === 1 ? "page" : "pages"}`,
      );
    }
    if (typeof metadata.note === "string" && metadata.note.trim()) {
      parts.push(`“${metadata.note.trim()}”`);
    }
    if (typeof metadata.reason === "string" && metadata.reason.trim()) {
      parts.push(metadata.reason.trim());
    }

    return {
      id: e.id,
      action: e.action,
      entityType: e.entity_type,
      entityId: e.entity_id,
      createdAt: e.created_at,
      actorName: e.actor_user_id ? (actors.get(e.actor_user_id) ?? null) : null,
      detail: parts.length > 0 ? parts.join(" · ") : null,
    };
  });
}

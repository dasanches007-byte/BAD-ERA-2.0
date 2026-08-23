import type { StatusTone } from "@/components/studio/primitives";

/**
 * Client-safe shapes for the Publishing workspace (Master Spec §13).
 *
 * `publishing.ts` is `server-only`, so anything a Client Component needs —
 * types and pure label helpers — lives here instead. Importing a runtime value
 * across that line is a build failure, which is the guard working.
 */

/** One page as it appears in the publish queue. */
export type PublishingPage = {
  pageId: string;
  pageKey: string;
  title: string;
  route: string | null;
  /** The revision the public site is serving right now, if any. */
  live: {
    revisionId: string;
    revisionNumber: number;
    publishedAt: string | null;
    note: string | null;
  } | null;
  /** The unpublished working draft, if the owner has edited since last publish. */
  draft: {
    revisionId: string;
    revisionNumber: number;
    autosavedAt: string;
    sectionCount: number;
  } | null;
};

export type RevisionRow = {
  id: string;
  revisionNumber: number;
  state: "draft" | "published" | "archived";
  createdAt: string;
  publishedAt: string | null;
  note: string | null;
  sourceRevisionId: string | null;
  sectionCount: number;
  isLive: boolean;
};

export type PublishSetItemRow = {
  pageId: string;
  pageKey: string;
  pageTitle: string;
  revisionNumber: number | null;
  previousRevisionNumber: number | null;
};

export type PublishSetRow = {
  id: string;
  status: "prepared" | "published" | "failed" | "rolled_back";
  note: string | null;
  createdAt: string;
  publishedAt: string | null;
  failedAt: string | null;
  actorName: string | null;
  items: PublishSetItemRow[];
};

export type AuditEventRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actorName: string | null;
  /** Pre-flattened for display; the raw row never reaches the browser. */
  detail: string | null;
};

/**
 * Publish-set status: colour plus a label, never colour alone
 * (Master Spec §10.4.19).
 */
export const PUBLISH_SET_LABEL: Record<PublishSetRow["status"], string> = {
  prepared: "Prepared",
  published: "Published",
  failed: "Failed",
  rolled_back: "Rolled back",
};

export const PUBLISH_SET_TONE: Record<PublishSetRow["status"], StatusTone> = {
  prepared: "info",
  published: "success",
  failed: "critical",
  rolled_back: "warning",
};

export const REVISION_LABEL: Record<RevisionRow["state"], string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const REVISION_TONE: Record<RevisionRow["state"], StatusTone> = {
  draft: "warning",
  published: "success",
  archived: "neutral",
};

/** Human sentences for the audit trail. Unknown actions degrade to the raw key. */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "page.publish": "Published a page",
  "page.rollback": "Rolled a page back",
  "publish_set.publish": "Published a set of pages",
  "publish_set.failed": "A publish attempt failed",
  "publish_set.rollback": "Rolled a publish back",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

/**
 * Whether a page has changes waiting to go live.
 *
 * A page with no live revision and a draft is a first publish; a page with both
 * is an update. Both are "pending" — the queue treats them the same.
 */
export function hasPendingChanges(page: PublishingPage): boolean {
  return page.draft !== null && page.draft.sectionCount > 0;
}

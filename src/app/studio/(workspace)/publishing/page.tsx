import Link from "next/link";

import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
  StatusChip,
  formatDateTime,
} from "@/components/studio/primitives";
import { PublishQueue } from "@/components/studio/publish-queue";
import {
  PageRevisionHistory,
  PublishSetHistory,
} from "@/components/studio/revision-history";
import {
  listPageRevisions,
  listPublishSets,
  listPublishingAudit,
  listPublishingPages,
} from "@/lib/cms/publishing";
import { auditActionLabel, hasPendingChanges } from "@/lib/cms/publishing-types";
import type {
  AuditEventRow,
  PublishSetRow,
  PublishingPage,
  RevisionRow,
} from "@/lib/cms/publishing-types";

export const metadata = { title: "Publishing" };

/**
 * Publishing (Master Spec §13).
 *
 * Four things, in the order the owner needs them:
 *
 *   1. what is waiting to go live, and what it would replace
 *   2. what is live right now, per page
 *   3. what went live before, as sets, each reversible
 *   4. who did what, and when
 *
 * Each panel loads independently. A failed read renders as a failure, never as
 * an empty list — an owner who reads "nothing pending" when the query broke
 * will ship nothing and never know why.
 */
export default async function StudioPublishingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: selectedPageKey } = await searchParams;

  const [pagesResult, setsResult, auditResult] = await Promise.allSettled([
    listPublishingPages(),
    listPublishSets(),
    listPublishingAudit(),
  ]);

  if (pagesResult.status === "rejected") {
    console.error("[bad-era] publishing pages read failed", pagesResult.reason);
  }
  if (setsResult.status === "rejected") {
    console.error("[bad-era] publish sets read failed", setsResult.reason);
  }
  if (auditResult.status === "rejected") {
    console.error("[bad-era] publishing audit read failed", auditResult.reason);
  }

  const pages: PublishingPage[] | null =
    pagesResult.status === "fulfilled" ? pagesResult.value : null;
  const sets: PublishSetRow[] | null =
    setsResult.status === "fulfilled" ? setsResult.value : null;
  const audit: AuditEventRow[] | null =
    auditResult.status === "fulfilled" ? auditResult.value : null;

  const pending = pages?.filter(hasPendingChanges) ?? [];

  // The revision panel focuses one page at a time: a combined list across every
  // page would bury the one history the owner came to look at.
  const focus =
    pages?.find((p) => p.pageKey === selectedPageKey) ?? pages?.[0] ?? null;

  let revisions: RevisionRow[] | null = null;
  if (focus) {
    try {
      revisions = await listPageRevisions(focus.pageId);
    } catch (error) {
      console.error("[bad-era] revision history read failed", error);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Site"
        title="Publishing"
        description="Draft edits never touch the live site. Publishing moves a validated revision into place, and every publish stays reversible."
      />

      <Panel
        title="Ready to publish"
        action={
          pending.length > 0 ? (
            <StatusChip tone="warning">
              {pending.length} {pending.length === 1 ? "page" : "pages"} pending
            </StatusChip>
          ) : null
        }
      >
        {pages === null ? (
          <LoadError what="the publish queue" />
        ) : pending.length === 0 ? (
          <EmptyState
            title="Nothing waiting"
            body="Every page is serving its latest published revision. Edits made in the Site Editor appear here as drafts."
            action={
              <Link
                href="/studio/site"
                className="label border border-line-strong px-4 py-2 text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
              >
                Open Site Editor
              </Link>
            }
          />
        ) : (
          <PublishQueue pages={pending} />
        )}
      </Panel>

      <Panel title="Live now">
        {pages === null ? (
          <LoadError what="page status" />
        ) : pages.length === 0 ? (
          <EmptyState
            title="No pages yet"
            body="Editable pages appear here once they exist in the content model."
          />
        ) : (
          <ul className="divide-y divide-line">
            {pages.map((p) => (
              <li
                key={p.pageId}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{p.title}</p>
                  <p className="mt-1 truncate text-xs text-ink-subtle">
                    {p.route ?? p.pageKey}
                    {p.live?.publishedAt
                      ? ` · published ${formatDateTime(p.live.publishedAt)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                  {p.draft ? (
                    <StatusChip tone="warning">Unpublished draft</StatusChip>
                  ) : null}
                  <StatusChip tone={p.live ? "success" : "neutral"}>
                    {p.live ? `Live · revision ${p.live.revisionNumber}` : "Not published"}
                  </StatusChip>
                  <Link
                    href={`/studio/publishing?page=${p.pageKey}`}
                    className="label text-ink-subtle transition-colors hover:text-accent-strong"
                  >
                    History
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {focus ? (
        <Panel title={`Revision history — ${focus.title}`}>
          {revisions === null ? (
            <LoadError what="revision history" />
          ) : revisions.length === 0 ? (
            <EmptyState
              title="No revisions yet"
              body="A revision is created the first time this page is edited in the Site Editor."
            />
          ) : (
            <PageRevisionHistory page={focus} revisions={revisions} />
          )}
        </Panel>
      ) : null}

      <Panel title="Publish history">
        {sets === null ? (
          <LoadError what="publish history" />
        ) : sets.length === 0 ? (
          <EmptyState
            title="Nothing published yet"
            body="Each publish is recorded here as a set, with the pages it moved and a way to roll the whole thing back."
          />
        ) : (
          <PublishSetHistory sets={sets} />
        )}
      </Panel>

      <Panel title="Audit trail">
        {audit === null ? (
          <LoadError what="the audit trail" />
        ) : audit.length === 0 ? (
          <EmptyState
            title="No publishing activity yet"
            body="Every publish and rollback is recorded here with who did it and when."
          />
        ) : (
          <ul className="divide-y divide-line">
            {audit.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-1 px-6 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink">{auditActionLabel(event.action)}</p>
                  {event.detail ? (
                    <p className="mt-1 break-words text-xs text-ink-subtle">
                      {event.detail}
                    </p>
                  ) : null}
                </div>
                <p className="text-xs text-ink-subtle sm:shrink-0 sm:text-right">
                  {formatDateTime(event.createdAt)}
                  {event.actorName ? ` · ${event.actorName}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

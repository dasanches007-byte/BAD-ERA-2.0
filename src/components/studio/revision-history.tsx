"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { StatusChip, formatDateTime } from "@/components/studio/primitives";
import { rollbackPageAction } from "@/lib/cms/page-actions";
import { rollbackPublishSetAction } from "@/lib/cms/publish-set-actions";
import {
  PUBLISH_SET_LABEL,
  PUBLISH_SET_TONE,
  REVISION_LABEL,
  REVISION_TONE,
} from "@/lib/cms/publishing-types";
import type {
  PublishSetRow,
  PublishingPage,
  RevisionRow,
} from "@/lib/cms/publishing-types";

/**
 * Revision history with rollback (Master Spec §13.1).
 *
 * Rollback never rewinds the pointer. It republishes the chosen revision as a
 * NEW revision, so the history above it survives and the rollback itself is an
 * entry in that history. The copy says so, because an owner who believes
 * rollback deletes their newer work will not use it when they need it.
 */
export function PageRevisionHistory({
  page,
  revisions,
}: {
  page: PublishingPage;
  revisions: RevisionRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  function rollback(revision: RevisionRow) {
    setMessage(null);
    startTransition(async () => {
      const result = await rollbackPageAction({
        pageId: page.pageId,
        targetRevisionId: revision.id,
      });
      setConfirmId(null);
      if (result.ok) {
        setMessage({
          tone: "ok",
          text: `Revision ${revision.revisionNumber} is live again, republished as a new revision.`,
        });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.message });
      }
    });
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {revisions.map((revision) => (
          <li key={revision.id} className="px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-ink">
                    Revision {revision.revisionNumber}
                  </span>
                  {revision.isLive ? (
                    <StatusChip tone="success">Live</StatusChip>
                  ) : (
                    <StatusChip tone={REVISION_TONE[revision.state]}>
                      {REVISION_LABEL[revision.state]}
                    </StatusChip>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-ink-subtle">
                  {revision.sectionCount}{" "}
                  {revision.sectionCount === 1 ? "section" : "sections"} ·{" "}
                  {revision.publishedAt
                    ? `published ${formatDateTime(revision.publishedAt)}`
                    : `created ${formatDateTime(revision.createdAt)}`}
                  {revision.note ? ` · ${revision.note}` : ""}
                </p>
              </div>

              {/* Only a published revision is a safe rollback target: a draft
                  was never validated for live, and the live one is already
                  live. */}
              {revision.state === "published" && !revision.isLive ? (
                confirmId === revision.id ? (
                  <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => rollback(revision)}
                      disabled={pending}
                      className="label border border-state-warning/50 px-3 py-1.5 text-state-warning transition-colors hover:bg-state-warning/10 disabled:opacity-40"
                    >
                      {pending ? "Restoring…" : "Confirm restore"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      disabled={pending}
                      className="label text-ink-subtle transition-colors hover:text-ink disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMessage(null);
                      setConfirmId(revision.id);
                    }}
                    className="label shrink-0 border border-line-strong px-3 py-1.5 text-ink-muted transition-colors hover:border-accent-strong hover:text-accent-strong"
                  >
                    Restore
                  </button>
                )
              ) : null}
            </div>

            {confirmId === revision.id ? (
              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-ink-subtle">
                Revision {revision.revisionNumber} is copied forward and
                published as a new revision. Everything published since stays in
                this history — nothing is deleted.
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {message ? (
        <p
          className={`border-t border-line px-6 py-4 text-xs leading-relaxed ${
            message.tone === "ok" ? "text-state-success" : "text-state-critical"
          }`}
          role="status"
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Publish sets, newest first, each expandable to the pages it moved.
 *
 * Rollback here undoes the whole set at once, restoring every page to the
 * revision recorded in `previous_revision_id`. Pages that have since been
 * published again are skipped rather than overwritten, and the result says
 * which — quietly discarding newer work would be the worse failure.
 */
export function PublishSetHistory({ sets }: { sets: PublishSetRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(sets[0]?.id ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  function rollback(set: PublishSetRow) {
    setMessage(null);
    startTransition(async () => {
      const result = await rollbackPublishSetAction({ publishSetId: set.id });
      setConfirmId(null);
      if (result.ok) {
        const parts = [
          result.restoredPageKeys.length > 0
            ? `Restored ${result.restoredPageKeys.join(", ")}.`
            : "No pages were restored.",
        ];
        if (result.skippedPageKeys.length > 0) {
          parts.push(
            `Skipped ${result.skippedPageKeys.join(", ")} — published again since, or never published before this set.`,
          );
        }
        setMessage({ tone: "ok", text: parts.join(" ") });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.message });
      }
    });
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {sets.map((set) => {
          const isOpen = expanded === set.id;
          return (
            <li key={set.id} className="px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : set.id)}
                  className="min-w-0 text-left"
                  aria-expanded={isOpen}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusChip tone={PUBLISH_SET_TONE[set.status]}>
                      {PUBLISH_SET_LABEL[set.status]}
                    </StatusChip>
                    <span className="text-sm text-ink">
                      {set.items.length}{" "}
                      {set.items.length === 1 ? "page" : "pages"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-subtle">
                    {formatDateTime(set.publishedAt ?? set.failedAt ?? set.createdAt)}
                    {set.actorName ? ` · ${set.actorName}` : ""}
                    {set.note ? ` · ${set.note}` : ""}
                  </p>
                </button>

                {set.status === "published" ? (
                  confirmId === set.id ? (
                    <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                      <button
                        type="button"
                        onClick={() => rollback(set)}
                        disabled={pending}
                        className="label border border-state-warning/50 px-3 py-1.5 text-state-warning transition-colors hover:bg-state-warning/10 disabled:opacity-40"
                      >
                        {pending ? "Rolling back…" : "Confirm rollback"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={pending}
                        className="label text-ink-subtle transition-colors hover:text-ink disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMessage(null);
                        setExpanded(set.id);
                        setConfirmId(set.id);
                      }}
                      className="label shrink-0 border border-line-strong px-3 py-1.5 text-ink-muted transition-colors hover:border-accent-strong hover:text-accent-strong"
                    >
                      Roll back
                    </button>
                  )
                ) : null}
              </div>

              {isOpen ? (
                <ul className="mt-4 space-y-1.5 border-l border-line pl-4">
                  {set.items.map((item) => (
                    <li key={item.pageId} className="text-xs text-ink-muted">
                      <span className="text-ink">{item.pageTitle}</span>
                      {" — "}
                      {item.previousRevisionNumber !== null
                        ? `revision ${item.previousRevisionNumber} → ${item.revisionNumber}`
                        : `first publish, revision ${item.revisionNumber}`}
                    </li>
                  ))}
                </ul>
              ) : null}

              {confirmId === set.id ? (
                <p className="mt-3 max-w-2xl text-xs leading-relaxed text-ink-subtle">
                  Each page goes back to the revision listed above, republished
                  as a new revision. Pages published again since this set are
                  left alone.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {message ? (
        <p
          className={`border-t border-line px-6 py-4 text-xs leading-relaxed ${
            message.tone === "ok" ? "text-state-success" : "text-state-critical"
          }`}
          role="status"
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { StatusChip, formatDateTime } from "@/components/studio/primitives";
import { publishPagesAction } from "@/lib/cms/publish-set-actions";
import type { PublishingPage } from "@/lib/cms/publishing-types";

/**
 * The publish queue (Master Spec §13.3).
 *
 * Publishing is the one Studio action that changes what the world sees, so it
 * is deliberately two steps: select, then confirm against an explicit list of
 * what goes live and what it replaces. No single click reaches the public site.
 *
 * The confirmation names the CURRENT live revision per page as well as the
 * incoming one, because "what am I undoing if this is wrong" is the question
 * the owner actually has at that moment.
 */
export function PublishQueue({ pages }: { pages: PublishingPage[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(pages.map((p) => p.pageId)),
  );
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  const chosen = pages.filter((p) => selected.has(p.pageId));

  function toggle(pageId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
    setResult(null);
  }

  function publish() {
    setResult(null);
    startTransition(async () => {
      const outcome = await publishPagesAction({
        pageIds: chosen.map((p) => p.pageId),
        note,
      });

      if (outcome.ok) {
        setResult({
          tone: "ok",
          text: `${outcome.publishedPageKeys.length} ${
            outcome.publishedPageKeys.length === 1 ? "page is" : "pages are"
          } live: ${outcome.publishedPageKeys.join(", ")}.`,
        });
        setConfirming(false);
        setNote("");
        router.refresh();
      } else {
        setResult({ tone: "error", text: outcome.message });
        // A partial failure changed live content, so the queue below is stale.
        if (outcome.publishedPageKeys?.length) router.refresh();
      }
    });
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {pages.map((page) => {
          const isSelected = selected.has(page.pageId);
          return (
            <li
              key={page.pageId}
              className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <label className="flex min-w-0 items-start gap-4">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(page.pageId)}
                  disabled={pending}
                  className="mt-1 size-4 shrink-0 accent-accent-strong"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">
                    {page.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-ink-subtle">
                    {page.route ?? page.pageKey} · draft r
                    {page.draft?.revisionNumber} ·{" "}
                    {page.draft ? formatDateTime(page.draft.autosavedAt) : ""}
                  </span>
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                <StatusChip tone={page.live ? "neutral" : "warning"}>
                  {page.live
                    ? `Live r${page.live.revisionNumber}`
                    : "Never published"}
                </StatusChip>
                <Link
                  href={`/studio/site/${page.pageKey}`}
                  className="label text-ink-subtle transition-colors hover:text-accent-strong"
                >
                  Edit
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="space-y-5 border-t border-line px-6 py-6">
        {confirming ? (
          <div className="hairline bg-surface-overlay px-5 py-5">
            <p className="label text-ink-subtle">Confirm what goes live</p>
            <ul className="mt-4 space-y-2">
              {chosen.map((page) => (
                <li key={page.pageId} className="text-sm text-ink-muted">
                  <span className="text-ink">{page.title}</span>
                  {" — "}
                  {page.live
                    ? `revision ${page.live.revisionNumber} is replaced by revision ${page.draft?.revisionNumber}`
                    : `first publish, revision ${page.draft?.revisionNumber}`}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
              Every page is validated before any of them goes live. If one fails,
              nothing is published. This set can be rolled back afterwards.
            </p>
          </div>
        ) : null}

        <label className="block">
          <span className="label text-ink-subtle">Note (optional)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={pending}
            maxLength={200}
            placeholder="What changed in this publish"
            className="mt-2 w-full border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-line-strong focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-4">
          {confirming ? (
            <>
              <button
                type="button"
                onClick={publish}
                disabled={pending || chosen.length === 0}
                className="label border border-accent-strong px-5 py-2.5 text-accent-strong transition-colors hover:bg-accent-strong hover:text-surface disabled:opacity-40"
              >
                {pending
                  ? "Publishing…"
                  : `Publish ${chosen.length} ${chosen.length === 1 ? "page" : "pages"}`}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="label text-ink-subtle transition-colors hover:text-ink disabled:opacity-40"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setConfirming(true);
              }}
              disabled={chosen.length === 0}
              className="label border border-line-strong px-5 py-2.5 text-ink transition-colors hover:border-accent-strong hover:text-accent-strong disabled:opacity-40"
            >
              Review {chosen.length} {chosen.length === 1 ? "page" : "pages"}
            </button>
          )}
        </div>

        {result ? (
          <p
            className={`text-xs leading-relaxed ${
              result.tone === "ok" ? "text-state-success" : "text-state-critical"
            }`}
            role="status"
          >
            {result.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

import Link from "next/link";

import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
  StatusChip,
  formatDateTime,
} from "@/components/studio/primitives";
import { listPages } from "@/lib/cms/pages";
import type { PageSummary } from "@/lib/cms/pages";
import { EDITABLE_PAGES, ensureEditablePages } from "@/lib/cms/system-pages";

export const metadata = { title: "Site Editor" };

/** The pages an owner edits most, first; information pages after, A to Z. */
const FIRST = ["home", "site", "shop", "product"];
const BLURBS: Record<string, string> = {
  home: "Your homepage: the hero, Featured Drops, From the Archive and the stories.",
  ...Object.fromEntries(EDITABLE_PAGES.map((page) => [page.pageKey, page.blurb])),
};

function order(pages: PageSummary[]): PageSummary[] {
  const rank = (key: string) => (FIRST.includes(key) ? FIRST.indexOf(key) : FIRST.length);
  return [...pages].sort((a, b) => rank(a.pageKey) - rank(b.pageKey) || a.title.localeCompare(b.title));
}

export default async function StudioSitePage() {
  // Menu & footer, Shop and Product pages are registered on first visit. If
  // that fails, the pages that exist are still listed.
  await ensureEditablePages().catch((error) => {
    console.error("[bad-era] registering editable pages failed", error);
  });

  let pages: PageSummary[];
  try {
    pages = order(await listPages());
  } catch (error) {
    console.error("[bad-era] pages read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Site" title="Site Editor" />
        <Panel>
          <LoadError what="pages" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Site"
        title="Site Editor"
        description="Open a page and click any words, link or photo to change them — including the menu and footer. Typography, colour and layout stay locked to the brand."
      />

      <Panel>
        {pages.length === 0 ? (
          <EmptyState
            title="No pages yet"
            body="Editable pages appear here once they exist in the content model."
          />
        ) : (
          <ul className="divide-y divide-line">
            {pages.map((page) => (
              <li
                key={page.id}
                className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{page.title}</p>
                  {BLURBS[page.pageKey] ? (
                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">
                      {BLURBS[page.pageKey]}
                    </p>
                  ) : null}
                  <p className="mt-1 truncate text-xs text-ink-subtle">
                    {page.route ?? (page.pageKey === "site" ? "Every page" : "Every product")}
                    {page.draftUpdatedAt
                      ? ` · draft saved ${formatDateTime(page.draftUpdatedAt)}`
                      : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {page.hasDraft ? (
                      <StatusChip tone="warning">Unpublished draft</StatusChip>
                    ) : null}
                    <StatusChip tone={page.publishedRevisionId ? "success" : "neutral"}>
                      {page.publishedRevisionId ? "Live" : "Not published"}
                    </StatusChip>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  {/* The easy way first: the page itself, click to change. */}
                  <Link
                    href={`/studio/edit/${page.pageKey}`}
                    className="label inline-flex min-h-11 items-center bg-ink px-5 text-inverse-ink transition-opacity hover:opacity-90"
                  >
                    Edit on the page
                  </Link>
                  <Link
                    href={`/studio/site/${page.pageKey}`}
                    className="label inline-flex min-h-11 items-center border border-line-strong px-5 text-ink transition-colors hover:border-ink"
                  >
                    All fields
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

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

export const metadata = { title: "Site Editor" };

export default async function StudioSitePage() {
  let pages: PageSummary[];
  try {
    pages = await listPages();
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
        description="Edit content within the approved design. Typography, colour and layout are locked by the template."
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
              <li key={page.id}>
                <Link
                  href={`/studio/site/${page.pageKey}`}
                  className="flex flex-col gap-3 px-6 py-5 transition-colors hover:bg-surface-overlay sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{page.title}</p>
                    <p className="mt-1 truncate text-xs text-ink-subtle">
                      {page.route ?? page.pageKey}
                      {page.draftUpdatedAt
                        ? ` · draft saved ${formatDateTime(page.draftUpdatedAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                    {page.hasDraft ? (
                      <StatusChip tone="warning">Unpublished draft</StatusChip>
                    ) : null}
                    <StatusChip
                      tone={page.publishedRevisionId ? "success" : "neutral"}
                    >
                      {page.publishedRevisionId ? "Live" : "Not published"}
                    </StatusChip>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

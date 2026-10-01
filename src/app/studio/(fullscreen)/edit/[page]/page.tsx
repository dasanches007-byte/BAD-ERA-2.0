import { notFound } from "next/navigation";

import { renderSections } from "@/components/sections/render";
import { OnPageEditor } from "@/components/studio/on-page/on-page-editor";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getStudioIdentityForRender } from "@/lib/auth/studio";
import { listActiveProducts } from "@/lib/catalog/queries";
import { safeCatalogRead } from "@/lib/catalog/safe";
import { CONTENT_TEMPLATE, countChangedSections } from "@/lib/cms/edit-targets";
import { getOrCreateDraft, getPublishedSections } from "@/lib/cms/pages";
import { listMedia } from "@/lib/studio/media";

export const metadata = {
  title: "Edit page",
  robots: { index: false, follow: false },
};

/** Draft content, per owner, per request: never cached or prerendered. */
export const dynamic = "force-dynamic";

/**
 * The on-page editor (/studio/edit/<page>).
 *
 * The owner's own storefront page, rendered from the DRAFT through the same
 * `renderSections` customers get, with click targets added. It lives in the
 * `(fullscreen)` group: behind the Studio gate (sign-in, second factor) but
 * without Studio's navigation, so it looks like the site, because it is.
 *
 * Opening it creates the draft if there is none (`ensure_page_draft`, one per
 * page, decided by the database). Every save re-renders this page from the
 * server, so the owner always sees what was saved rather than an imitation.
 */
export default async function EditPagePage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  // The gate layout has already redirected anyone else; this is the second,
  // in-page check every Studio surface makes.
  const identity = await getStudioIdentityForRender();
  if (!identity) notFound();

  const { page: pageKey } = await params;
  const draft = await getOrCreateDraft(pageKey);
  if (!draft) notFound();

  const [live, products, media] = await Promise.all([
    getPublishedSections(pageKey),
    safeCatalogRead("on-page editor", listActiveProducts),
    // An unreachable library should not stop the owner editing words.
    listMedia().catch((error) => {
      console.error("[bad-era] media read failed in on-page editor", error);
      return [];
    }),
  ]);

  return (
    <OnPageEditor
      // A publish opens a new draft revision; start fresh on it rather than
      // carrying the old revision's version tokens forward.
      key={draft.revisionId}
      pageId={draft.pageId}
      pageKey={draft.pageKey}
      pageTitle={draft.title}
      liveHref={draft.route ?? "/"}
      revisionId={draft.revisionId}
      sections={draft.sections}
      versions={Object.fromEntries(draft.sectionRows.map((row) => [row.sectionKey, row.version]))}
      media={media}
      changedCount={countChangedSections(draft.sections, live)}
      hasPublished={Boolean(draft.publishedRevisionId)}
      startable={draft.templateKey === CONTENT_TEMPLATE && draft.sections.length === 0}
    >
      <div className="flex min-h-screen flex-col bg-surface text-ink">
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {renderSections(draft.sections, products, { editing: true })}
        </main>
        <SiteFooter />
      </div>
    </OnPageEditor>
  );
}

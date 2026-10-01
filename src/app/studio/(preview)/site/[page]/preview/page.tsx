import { notFound } from "next/navigation";

import { renderSections } from "@/components/sections/render";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getStudioIdentityForRender } from "@/lib/auth/studio";
import { getExistingDraft, getPublishedSections } from "@/lib/cms/pages";
import { listActiveProducts } from "@/lib/catalog/queries";
import { safeCatalogRead } from "@/lib/catalog/safe";

export const metadata = { robots: { index: false, follow: false } };

/** Draft content is per-request and must never be cached or prerendered. */
export const dynamic = "force-dynamic";

/**
 * Draft preview (Master Spec §11.4.5).
 *
 * Renders the DRAFT revision through the same `renderSections` the public page
 * uses, so what the owner sees is what publishing will produce.
 *
 * It sits in the `(preview)` route group so it inherits the Studio gate
 * (sign-in, second factor) but not Studio's navigation — the frame shows the
 * storefront. The identity is checked again here: draft content must never be
 * reachable by an anonymous request, and it must never pollute the public cache
 * or SEO.
 *
 * A preview is a read. It never creates a draft: the editor page that frames it
 * has already ensured one exists. It used to call `getOrCreateDraft`, and on
 * the owner's first session that write is what failed inside the frame. With
 * no draft (opened directly, or the draft was just published) it shows what is
 * live instead.
 */
export default async function DraftPreviewPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const identity = await getStudioIdentityForRender();
  if (!identity) notFound();

  const { page: pageKey } = await params;
  const draft = await getExistingDraft(pageKey);
  const sections = draft?.sections ?? (await getPublishedSections(pageKey));
  if (!sections) notFound();

  const products = await safeCatalogRead("preview", listActiveProducts);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <SiteHeader />
      <main className="flex-1">{renderSections(sections, products)}</main>
      <SiteFooter />
    </div>
  );
}

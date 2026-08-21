import { notFound } from "next/navigation";

import { renderSections } from "@/components/sections/render";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getStudioIdentity } from "@/lib/auth/studio";
import { getOrCreateDraft } from "@/lib/cms/pages";
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
 * Access is owner-gated. This route sits under /studio, so the Studio layout
 * already redirects unauthenticated callers, and the identity is checked again
 * here: draft content must never be reachable by an anonymous request, and it
 * must never pollute the public cache or SEO.
 */
export default async function DraftPreviewPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const identity = await getStudioIdentity();
  if (!identity) notFound();

  const { page: pageKey } = await params;
  const draft = await getOrCreateDraft(pageKey);
  if (!draft) notFound();

  const products = await safeCatalogRead("preview", listActiveProducts);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <SiteHeader />
      <main className="flex-1">{renderSections(draft.sections, products)}</main>
      <SiteFooter />
    </div>
  );
}

import { renderSections } from "@/components/sections/render";
import { OwnerEditLink } from "@/components/storefront/owner-edit-link";
import { listActiveProductsCached } from "@/lib/catalog/cache";
import { safeCatalogRead } from "@/lib/catalog/safe";
import { DEFAULT_SHOP_CATALOG, pickSection } from "@/lib/cms/default-pages";
import { readPublishedForStorefront } from "@/lib/cms/pages";

export const metadata = {
  title: "Shop All",
  description: "Every BAD ERA piece, current and archive.",
};

// Dynamic so the CSP nonce applies; the catalog read itself stays cached.
// See src/lib/catalog/cache.ts for why the cache moved off the page.
export const dynamic = "force-dynamic";

/**
 * Shop All (Master Spec §4).
 *
 * The words are the owner's (Studio → Site → Shop); the grid is the live
 * catalog. Until the Shop page is published, or if it cannot be read, the
 * shipped wording renders. See `ShopCatalog` for the layout.
 */
export default async function ShopPage() {
  const [published, products] = await Promise.all([
    readPublishedForStorefront("shop"),
    safeCatalogRead("shop", listActiveProductsCached),
  ]);
  const section = pickSection(published, "shop.catalog", DEFAULT_SHOP_CATALOG);

  return (
    <>
      {renderSections([section], products)}
      <OwnerEditLink pageKey="shop" />
    </>
  );
}

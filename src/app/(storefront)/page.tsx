import { renderSections } from "@/components/sections/render";
import { DEFAULT_HOME_SECTIONS } from "@/lib/cms/default-home";
import { getPublishedSections } from "@/lib/cms/pages";
import { listActiveProductsCached } from "@/lib/catalog/cache";
import { safeCatalogRead } from "@/lib/catalog/safe";

/**
 * Homepage — the approved Homepage 3.0 structure (Master Spec §3.1).
 *
 * Sections come from the PUBLISHED revision in `page_sections`. That is the
 * Phase 4 seam Phase 2 was built around: only the data source changed, and not
 * one renderer was touched.
 *
 * `DEFAULT_HOME_SECTIONS` survives as a fallback for a database that has never
 * been seeded, so a fresh environment still renders the approved structure
 * instead of a blank page.
 *
 * Renders dynamically so the nonce-based CSP applies (Phase 9). A prerendered
 * page cannot carry a per-request nonce, so every script tag on it would be
 * blocked — measured: 13 script tags, 0 nonced, before this change.
 *
 * The once-a-minute database load that `revalidate` used to provide now lives
 * in `listActiveProductsCached`, so this costs a render, not a query.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Published content wins. The fallback covers two cases: a database that has
  // never been seeded, and one that is unreachable.
  //
  // The second still matters at request time: the storefront must survive an
  // unreachable database by degrading to the approved structure rather than
  // serving a blank page. (The build no longer prerenders this page at all, so
  // a database outage can no longer fail a build either way.)
  const published = await getPublishedSections("home").catch((error) => {
    console.error("[bad-era] published sections read failed; using defaults", error);
    return null;
  });
  const sections = published ?? DEFAULT_HOME_SECTIONS;

  // One catalog read serves every product-backed section on the page.
  const products = await safeCatalogRead("home", listActiveProductsCached);

  return <>{renderSections(sections, products)}</>;
}

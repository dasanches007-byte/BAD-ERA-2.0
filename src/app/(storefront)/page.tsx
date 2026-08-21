import { renderSections } from "@/components/sections/render";
import { DEFAULT_HOME_SECTIONS } from "@/lib/cms/default-home";
import { getPublishedSections } from "@/lib/cms/pages";
import { listActiveProducts } from "@/lib/catalog/queries";
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
 * Revalidates rather than rendering fully dynamically, so a publish reaches the
 * page without a deploy.
 */
export const revalidate = 60;

export default async function HomePage() {
  // Published content wins. The fallback covers two cases: a database that has
  // never been seeded, and one that is unreachable.
  //
  // The second matters because `next build` prerenders this page and must stay
  // hermetic — a build that fails when the database is down is a build that
  // cannot ship a hotfix. Degrading to the approved structure beats both a
  // failed build and a blank page, so the failure is logged loudly instead.
  const published = await getPublishedSections("home").catch((error) => {
    console.error("[bad-era] published sections read failed; using defaults", error);
    return null;
  });
  const sections = published ?? DEFAULT_HOME_SECTIONS;

  // One catalog read serves every product-backed section on the page.
  const products = await safeCatalogRead("home", listActiveProducts);

  return <>{renderSections(sections, products)}</>;
}

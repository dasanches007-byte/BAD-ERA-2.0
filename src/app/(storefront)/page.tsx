import {
  CampaignFeature,
  EditorialStoryGrid,
  HeroEditorial,
  Newsletter,
  TrustStrip,
} from "@/components/sections";
import {
  Archive01Feature,
  ProductRail,
} from "@/components/sections/product-sections";
import { DEFAULT_HOME_SECTIONS } from "@/lib/cms/default-home";
import { listActiveProducts } from "@/lib/catalog/queries";
import { safeCatalogRead } from "@/lib/catalog/safe";
import type { CatalogProduct } from "@/lib/catalog/queries";
import type { Section } from "@/lib/cms/sections";

/**
 * Homepage — the approved Homepage 3.0 structure (Master Spec §3.1).
 *
 * Sections come from `DEFAULT_HOME_SECTIONS` today. Phase 4 swaps that single
 * import for a `page_sections` read against the published revision; every
 * renderer below stays exactly as it is.
 *
 * Revalidates rather than rendering fully dynamically, so inventory and price
 * changes reach the page without a deploy.
 */
export const revalidate = 60;

export default async function HomePage() {
  const sections = DEFAULT_HOME_SECTIONS.filter((s) => s.enabled);

  // One catalog read serves every product-backed section on the page.
  const products = await safeCatalogRead("home", listActiveProducts);
  const byHandle = new Map(products.map((p) => [p.handle, p]));

  return <>{sections.map((section) => renderSection(section, products, byHandle))}</>;
}

function renderSection(
  section: Section,
  allProducts: CatalogProduct[],
  byHandle: Map<string, CatalogProduct>,
) {
  switch (section.type) {
    case "hero.editorial":
      return <HeroEditorial key={section.sectionId} section={section} />;

    case "trust.strip":
      return <TrustStrip key={section.sectionId} section={section} />;

    case "campaign.feature":
      return <CampaignFeature key={section.sectionId} section={section} />;

    case "product.rail": {
      // Curated order wins. An empty curation falls back to active products
      // rather than rendering an empty rail.
      const curated = section.productHandles
        .map((handle) => byHandle.get(handle))
        .filter((p): p is CatalogProduct => Boolean(p));
      const products = curated.length > 0 ? curated : allProducts.slice(0, 4);
      return (
        <ProductRail key={section.sectionId} section={section} products={products} />
      );
    }

    case "archive01.feature": {
      const products = section.productHandles
        .map((handle) => byHandle.get(handle))
        .filter((p): p is CatalogProduct => Boolean(p));
      return (
        <Archive01Feature
          key={section.sectionId}
          section={section}
          products={products}
        />
      );
    }

    case "editorial.story_grid":
      return <EditorialStoryGrid key={section.sectionId} section={section} />;

    case "newsletter":
      return <Newsletter key={section.sectionId} section={section} />;

    default: {
      // Exhaustiveness: adding a section type without a renderer is a compile
      // error, not a silently blank page.
      const _never: never = section;
      return _never;
    }
  }
}

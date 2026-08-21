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
import type { CatalogProduct } from "@/lib/catalog/queries";
import type { Section } from "@/lib/cms/sections";

/**
 * The single section renderer.
 *
 * Both the public page and the Site Editor's draft preview call this, so the
 * preview cannot drift from what publishing actually produces. A preview that
 * renders through a different path is a preview that lies.
 *
 * The switch is exhaustive: registering a section type without a renderer is a
 * compile error rather than a silently blank page.
 */
export function renderSections(
  sections: Section[],
  products: CatalogProduct[],
): React.ReactNode {
  const byHandle = new Map(products.map((p) => [p.handle, p]));
  return sections
    .filter((section) => section.enabled)
    .map((section) => renderSection(section, products, byHandle));
}

function renderSection(
  section: Section,
  allProducts: CatalogProduct[],
  byHandle: Map<string, CatalogProduct>,
): React.ReactNode {
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
      const _never: never = section;
      return _never;
    }
  }
}

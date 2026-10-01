import {
  CampaignFeature,
  EditorialStoryGrid,
  HeroEditorial,
  LegalProse,
  Newsletter,
  TrustStrip,
} from "@/components/sections";
import {
  Archive01Feature,
  ProductRail,
} from "@/components/sections/product-sections";
import type { CatalogProduct } from "@/lib/catalog/queries";
import { SECTION_ATTR } from "@/lib/cms/edit-targets";
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
 *
 * `editing` is for owner-gated Studio routes only — the on-page editor and the
 * Site Editor's preview. It is the same render with click targets added, so
 * what the owner edits is what customers will see. Public pages never pass it.
 */
export function renderSections(
  sections: Section[],
  products: CatalogProduct[],
  options: { editing?: boolean } = {},
): React.ReactNode {
  const byHandle = new Map(products.map((p) => [p.handle, p]));
  const editing = options.editing === true;
  return sections
    .filter((section) => section.enabled)
    .map((section) => {
      const node = renderSection(section, products, byHandle, editing);
      // A wrapper lets the Site Editor scroll the preview to a section picked
      // from its list. Block-level and unstyled, so layout is unchanged.
      return editing ? (
        <div key={section.sectionId} {...{ [SECTION_ATTR]: section.sectionId }}>
          {node}
        </div>
      ) : (
        node
      );
    });
}

function renderSection(
  section: Section,
  allProducts: CatalogProduct[],
  byHandle: Map<string, CatalogProduct>,
  editing: boolean,
): React.ReactNode {
  switch (section.type) {
    case "hero.editorial":
      return <HeroEditorial key={section.sectionId} section={section} editing={editing} />;

    case "trust.strip":
      return <TrustStrip key={section.sectionId} section={section} editing={editing} />;

    case "campaign.feature":
      return <CampaignFeature key={section.sectionId} section={section} editing={editing} />;

    case "product.rail": {
      // Curated order wins. An empty curation falls back to active products
      // rather than rendering an empty rail.
      const curated = section.productHandles
        .map((handle) => byHandle.get(handle))
        .filter((p): p is CatalogProduct => Boolean(p));
      const products = curated.length > 0 ? curated : allProducts.slice(0, 4);
      return (
        <ProductRail
          key={section.sectionId}
          section={section}
          products={products}
          editing={editing}
        />
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
          editing={editing}
        />
      );
    }

    case "editorial.story_grid":
      return (
        <EditorialStoryGrid key={section.sectionId} section={section} editing={editing} />
      );

    case "newsletter":
      return <Newsletter key={section.sectionId} section={section} editing={editing} />;

    case "legal.prose":
      return <LegalProse key={section.sectionId} section={section} editing={editing} />;

    default: {
      const _never: never = section;
      return _never;
    }
  }
}

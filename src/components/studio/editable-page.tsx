import { renderSections } from "@/components/sections/render";
import { isArchiveProduct } from "@/components/sections/page-sections";
import { StorefrontFrame } from "@/components/storefront/storefront-frame";
import type { CatalogProduct } from "@/lib/catalog/queries";
import {
  chromeFrom,
  DEFAULT_PRODUCT_WORDING,
  DEFAULT_SHOP_CATALOG,
  pickSection,
  type SiteChrome,
} from "@/lib/cms/default-pages";
import { CHROME_TEMPLATE, PRODUCT_TEMPLATE, SHOP_TEMPLATE } from "@/lib/cms/edit-targets";
import type { Section } from "@/lib/cms/sections";

/**
 * What the two editors draw for a page — the on-page editor and the Site
 * Editor's preview: the page's DRAFT inside the storefront frame, composed
 * exactly as the public route composes it.
 *
 *   Menu & footer  the draft's own header and footer, editable, around a note
 *   Shop           the Shop page's words around the live product grid
 *   Product pages  the shared wording around one real, live product
 *   anything else  the draft's sections, as the homepage and info pages do
 *
 * `editing` is passed by the two owner-gated routes only.
 */
export function editablePageView({
  templateKey,
  sections,
  products,
  chrome,
  editing,
}: {
  templateKey: string;
  sections: Section[];
  products: CatalogProduct[];
  /** The live menu and footer, shown around every page but their own. */
  chrome: SiteChrome;
  editing: boolean;
}): React.ReactNode {
  if (templateKey === CHROME_TEMPLATE) {
    return (
      <StorefrontFrame chrome={chromeFrom(sections)} editChrome={editing}>
        <div className="shell flex min-h-[45vh] flex-col items-center justify-center py-24 text-center">
          <p className="label text-ink-subtle">Every page</p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
            Each page&rsquo;s own content goes here. The menu above and the footer below are
            shared by all of them — tap any of their words or links to change them.
          </p>
        </div>
      </StorefrontFrame>
    );
  }

  let body: React.ReactNode;
  if (templateKey === SHOP_TEMPLATE) {
    body = renderSections([pickSection(sections, "shop.catalog", DEFAULT_SHOP_CATALOG)], products, {
      editing,
    });
  } else if (templateKey === PRODUCT_TEMPLATE) {
    body = renderSections(
      [pickSection(sections, "product.wording", DEFAULT_PRODUCT_WORDING)],
      products,
      { editing, product: sampleProduct(products) },
    );
  } else {
    body = renderSections(sections, products, { editing });
  }

  return <StorefrontFrame chrome={chrome}>{body}</StorefrontFrame>;
}

/**
 * The product the "Product pages" editor shows: a real live one, so the owner
 * sees their words around real photos and prices. An Archive 01 piece with a
 * description shows the most of the template, so it is preferred.
 */
export function sampleProduct(products: CatalogProduct[]): CatalogProduct | null {
  const score = (p: CatalogProduct) => (isArchiveProduct(p) ? 2 : 0) + (p.description ? 1 : 0);
  return [...products].sort((a, b) => score(b) - score(a))[0] ?? null;
}

import { ProductCard } from "@/components/storefront/product-card";
import { ProductDetail } from "@/components/storefront/product-detail";
import type { CatalogProduct } from "@/lib/catalog/queries";
import { editAttrs } from "@/lib/cms/edit-targets";
import type { ProductWordingSection, ShopCatalogSection } from "@/lib/cms/sections";

/**
 * The Shop page and the product page, as sections.
 *
 * Their WORDS are the owner's (Studio → Site → Shop, Product pages); the
 * products, prices, stock and purchase controls are commerce data and never
 * pass through the Site Editor. Rendering them through `renderSections` means
 * the editor shows the real page, and the page cannot drift from the editor.
 */

/**
 * Shop All (Master Spec §4). Editorial header, then a product grid that must
 * accommodate apparel, accessories and future eyewear without redesign.
 * Filtering and sorting arrive with real catalog breadth; shipping empty
 * filter chrome now would be noise.
 */
export function ShopCatalog({
  section,
  products,
  editing,
}: {
  section: ShopCatalogSection;
  products: CatalogProduct[];
  editing?: boolean;
}) {
  return (
    <>
      <header className="shell pt-20 pb-14 lg:pt-28 lg:pb-20">
        {section.eyebrow || editing ? (
          <p
            {...editAttrs(editing, section, "eyebrow")}
            {...(section.eyebrow ? {} : { "data-be-empty": "" })}
            className="label text-ink-subtle"
          >
            {section.eyebrow || "+ Add a small heading"}
          </p>
        ) : null}
        <h1
          {...editAttrs(editing, section, "headline")}
          className="mt-6 font-display text-display-lg text-ink-strong"
        >
          {section.headline}
        </h1>
      </header>

      <div className="shell pb-section">
        {products.length === 0 ? (
          // Zero-result state (Master Spec §20.1). Calm, not an error page.
          <div className="hairline flex min-h-[40vh] flex-col items-center justify-center gap-4 bg-surface-raised px-6 text-center">
            <p {...editAttrs(editing, section, "emptyTitle")} className="label text-ink-subtle">
              {section.emptyTitle}
            </p>
            <p
              {...editAttrs(editing, section, "emptyText")}
              className="max-w-sm text-sm leading-relaxed text-ink-muted"
            >
              {section.emptyText}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** Archive 01 pieces carry the archive label and note. */
export function isArchiveProduct(product: CatalogProduct): boolean {
  return product.tags.some((t) => t.toLowerCase().includes("archive"));
}

/**
 * Product detail — the shared Editorial Commerce template (Master Spec §5).
 *
 * ONE template renders every product from structured data. Never a bespoke
 * page per product (Master Spec §10.3.2). The product's own words come from
 * the product; the words around them come from this section.
 *
 * While editing, the wording a customer would only see on SOME products — the
 * Archive 01 lines on a non-archive piece, the details heading on a product
 * with no description yet — is drawn as a faint stand-in, so every word on
 * this template can be reached from whichever product is showing.
 */
export function ProductPage({
  section,
  product,
  editing,
}: {
  section: ProductWordingSection;
  product: CatalogProduct | null;
  editing?: boolean;
}) {
  if (!product) {
    if (!editing) return null;
    return (
      <article className="shell py-14 lg:py-20">
        <p className="max-w-md text-sm leading-relaxed text-ink-muted">
          Once a product is live, this page shows it with the words below. Add one in Studio →
          Products.
        </p>
        <div className="mt-10 max-w-md">
          <Wording section={section} product={null} editing={editing} />
        </div>
      </article>
    );
  }

  const archive = isArchiveProduct(product);
  const edit = (path: string) => editAttrs(editing, section, path);

  return (
    <article className="shell py-14 lg:py-20">
      <ProductDetail
        product={product}
        header={
          <>
            {archive && section.archiveLabel ? (
              <p {...edit("archiveLabel")} className="label mb-5 text-ink-subtle">
                {section.archiveLabel}
              </p>
            ) : editing ? (
              <p {...edit("archiveLabel")} data-be-empty="" className="label mb-5 text-ink-disabled">
                {section.archiveLabel || "+ Archive 01 label"} · Archive 01 pieces only
              </p>
            ) : null}
            <h1 className="font-display text-display-md text-ink-strong">{product.title}</h1>
            {product.subtitle ? (
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">{product.subtitle}</p>
            ) : null}
          </>
        }
        details={<Wording section={section} product={product} editing={editing} />}
      />
    </article>
  );
}

/** Details, the Archive 01 note and the shared note, under the purchase controls. */
function Wording({
  section,
  product,
  editing,
}: {
  section: ProductWordingSection;
  product: CatalogProduct | null;
  editing?: boolean;
}) {
  const edit = (path: string) => editAttrs(editing, section, path);
  const archive = product ? isArchiveProduct(product) : false;
  const description = product?.description ?? null;

  return (
    <>
      {description || editing ? (
        <div className="mt-14 border-t border-line pt-8">
          {section.detailsHeading ? (
            <h2 {...edit("detailsHeading")} className="label mb-4 text-ink-subtle">
              {section.detailsHeading}
            </h2>
          ) : editing ? (
            <p {...edit("detailsHeading")} data-be-empty="" className="label mb-4 text-ink-disabled">
              + Details heading
            </p>
          ) : null}
          {description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">{description}</p>
          ) : (
            // Editing only: the product's own words live with the product.
            <p data-be-empty="" className="text-sm leading-relaxed text-ink-subtle">
              This product has no description yet. Write it in Studio → Products.
            </p>
          )}
        </div>
      ) : null}
      {section.note ? (
        <p {...edit("note")} className="mt-8 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
          {section.note}
        </p>
      ) : editing ? (
        <p {...edit("note")} data-be-empty="" className="mt-8 text-sm leading-relaxed text-ink-subtle">
          + Add a note for every product page
        </p>
      ) : null}
      {archive && section.archiveNote ? (
        <p {...edit("archiveNote")} className="label mt-10 text-ink-subtle">
          {section.archiveNote}
        </p>
      ) : editing ? (
        <p {...edit("archiveNote")} data-be-empty="" className="label mt-10 text-ink-disabled">
          {section.archiveNote || "+ Archive 01 note"} · Archive 01 pieces only
        </p>
      ) : null}
    </>
  );
}

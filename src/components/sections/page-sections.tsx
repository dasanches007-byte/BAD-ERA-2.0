import Link from "next/link";

import { ProductCard } from "@/components/storefront/product-card";
import { ProductDetail } from "@/components/storefront/product-detail";
import { Poster } from "@/components/ui/poster";
import type { CatalogProduct } from "@/lib/catalog/queries";
import { editAttrs } from "@/lib/cms/edit-targets";
import type { ProductWordingSection, ShopCatalogSection } from "@/lib/cms/sections";

/**
 * The Shop page and the product page, as sections, in the cement design.
 *
 * Their WORDS are the owner's (Studio → Site → Shop, Product pages); the
 * products, prices, stock and purchase controls are commerce data and never
 * pass through the Site Editor. Rendering them through `renderSections` means
 * the editor shows the real page, and the page cannot drift from the editor.
 */

const SMALL = "text-xs font-semibold uppercase tracking-[0.14em]";

/**
 * Shop All (Master Spec §4), on pale cement: the heading in the poster voice,
 * then every live piece in the same line-up the homepage uses. Filtering and
 * sorting arrive with real catalog breadth; shipping empty filter chrome now
 * would be noise.
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
    <section
      className="pale min-h-[80vh] px-4 pb-24 pt-14 lg:px-[72px] lg:pb-32 lg:pt-20"
      data-tone="light"
    >
      <header className="mb-10">
        {section.eyebrow || editing ? (
          <p
            {...editAttrs(editing, section, "eyebrow")}
            {...(section.eyebrow ? {} : { "data-be-empty": "" })}
            className={`${SMALL} mb-4 text-pale-muted`}
          >
            {section.eyebrow || "+ Add a small heading"}
          </p>
        ) : null}
        <Poster
          as="h1"
          text={section.headline}
          cap="24cqi"
          max="10.5rem"
          fill="60vh"
          rise={false}
          edit={editAttrs(editing, section, "headline")}
        />
      </header>

      {products.length === 0 ? (
        // Zero-result state (Master Spec §20.1). Calm, not an error page.
        <div className="flex min-h-[40vh] flex-col items-start justify-center gap-4 border-y-[1.5px] border-pale-ink py-12">
          <p {...editAttrs(editing, section, "emptyTitle")} className="poster text-[clamp(2.125rem,9.6vw,4rem)] leading-[0.88]">
            {section.emptyTitle}
          </p>
          <p
            {...editAttrs(editing, section, "emptyText")}
            className="max-w-sm text-sm leading-relaxed text-pale-muted"
          >
            {section.emptyText}
          </p>
        </div>
      ) : (
        <div className="grid border-t-[1.5px] border-pale-ink lg:grid-cols-3 lg:gap-x-7 lg:gap-y-10 lg:border-t-0">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} tone="pale" />
          ))}
        </div>
      )}
    </section>
  );
}

/** Archive 01 pieces carry the archive label and note. */
export function isArchiveProduct(product: CatalogProduct): boolean {
  return product.tags.some((t) => t.toLowerCase().includes("archive"));
}

/** The arrow on the back link: the pill's arrow, turned round. */
function BackArrow() {
  return (
    <svg viewBox="0 0 18 10" width="18" height="10" aria-hidden="true" className="-scale-x-100">
      <path d="M0 5h16.5M12.5 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/**
 * Product detail — the shared template (Master Spec §5).
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
  const edit = (path: string) => editAttrs(editing, section, path);

  if (!product) {
    if (!editing) return null;
    return (
      <article className="pale px-4 py-14 lg:px-16 lg:py-20" data-tone="light">
        <p className="max-w-md text-sm leading-relaxed text-pale-muted">
          Once a product is live, this page shows it with the words below. Add one in Studio →
          Products.
        </p>
        <div className="mt-10 grid max-w-md gap-6">
          <BackLink section={section} editing={editing} />
          <ZoomHint section={section} editing={editing} standalone />
          <Wording section={section} product={null} editing={editing} />
        </div>
      </article>
    );
  }

  const archive = isArchiveProduct(product);

  return (
    <ProductDetail
      product={product}
      back={<BackLink section={section} editing={editing} />}
      zoomHint={<ZoomHint section={section} editing={editing} />}
      header={
        <>
          {archive && section.archiveLabel ? (
            <p {...edit("archiveLabel")} className={`${SMALL} mb-3 text-pale-muted`}>
              {section.archiveLabel}
            </p>
          ) : editing ? (
            <p {...edit("archiveLabel")} data-be-empty="" className={`${SMALL} mb-3 text-pale-muted/70`}>
              {section.archiveLabel || "+ Archive 01 label"} · Archive 01 pieces only
            </p>
          ) : null}
          <Poster as="h1" text={product.title} cap="34cqi" max="9.375rem" fill="42vh" rise={false} />
          {product.subtitle ? (
            <p className="mt-3 text-sm leading-relaxed text-pale-muted">{product.subtitle}</p>
          ) : null}
        </>
      }
      details={<Wording section={section} product={product} editing={editing} />}
    />
  );
}

function BackLink({ section, editing }: { section: ProductWordingSection; editing?: boolean }) {
  const edit = editAttrs(editing, section, "backLabel");
  if (!section.backLabel) {
    return editing ? (
      <p {...edit} data-be-empty="" className={`${SMALL} text-pale-muted/70`}>
        + Back link
      </p>
    ) : null;
  }
  return (
    <Link
      {...edit}
      href="/shop"
      className={`${SMALL} inline-flex items-center gap-2.5 justify-self-start py-2 transition-opacity hover:opacity-70`}
    >
      <BackArrow />
      {section.backLabel}
    </Link>
  );
}

/**
 * How to zoom in: one line for a finger, one for a mouse. CSS shows whichever
 * the device is; both are shown while editing, so each can be tapped.
 * `standalone` is the same pair as plain lines, for the editor when there is
 * no product to show.
 */
function ZoomHint({
  section,
  editing,
  standalone = false,
}: {
  section: ProductWordingSection;
  editing?: boolean;
  standalone?: boolean;
}) {
  const touch = section.zoomHintTouch;
  const mouse = section.zoomHintMouse;
  if (!touch && !mouse && !editing) return null;
  const lines = (
    <>
      {touch || editing ? (
        <span
          {...editAttrs(editing, section, "zoomHintTouch")}
          {...(touch ? {} : { "data-be-empty": "" })}
          className="for-touch"
        >
          {touch || "+ Zoom hint for phones"}
        </span>
      ) : null}
      {mouse || editing ? (
        <span
          {...editAttrs(editing, section, "zoomHintMouse")}
          {...(mouse ? {} : { "data-be-empty": "" })}
          className="for-mouse"
        >
          {mouse || "+ Zoom hint for computers"}
        </span>
      ) : null}
    </>
  );
  if (standalone) {
    return <p className="stage-hint-plain grid justify-items-start gap-2">{lines}</p>;
  }
  // A caption for the eye: the photo's own button says the same to a reader.
  return (
    <p className="stage-hint" aria-hidden={editing ? undefined : true}>
      {lines}
    </p>
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
  const fine = "max-w-[44ch] text-[13px] leading-[1.55] text-pale-muted";

  return (
    <div className="grid gap-5">
      {description || editing ? (
        <div className="border-t-[1.5px] border-pale-ink pt-5">
          {section.detailsHeading ? (
            <h2 {...edit("detailsHeading")} className={`${SMALL} mb-3`}>
              {section.detailsHeading}
            </h2>
          ) : editing ? (
            <p {...edit("detailsHeading")} data-be-empty="" className={`${SMALL} mb-3 text-pale-muted/70`}>
              + Details heading
            </p>
          ) : null}
          {description ? (
            <p className={`whitespace-pre-line ${fine}`}>{description}</p>
          ) : (
            // Editing only: the product's own words live with the product.
            <p data-be-empty="" className={fine}>
              This product has no description yet. Write it in Studio → Products.
            </p>
          )}
        </div>
      ) : null}
      {section.note ? (
        <p {...edit("note")} className={`whitespace-pre-line ${fine}`}>
          {section.note}
        </p>
      ) : editing ? (
        <p {...edit("note")} data-be-empty="" className={`${fine} opacity-70`}>
          + Add a note for every product page
        </p>
      ) : null}
      {archive && section.archiveNote ? (
        <p {...edit("archiveNote")} className={`${SMALL} text-pale-muted`}>
          {section.archiveNote}
        </p>
      ) : editing ? (
        <p {...edit("archiveNote")} data-be-empty="" className={`${SMALL} text-pale-muted/70`}>
          {section.archiveNote || "+ Archive 01 note"} · Archive 01 pieces only
        </p>
      ) : null}
    </div>
  );
}

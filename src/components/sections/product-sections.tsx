import { Cta } from "@/components/sections";
import { ProductCard } from "@/components/storefront/product-card";
import { Poster } from "@/components/ui/poster";
import { editAttrs } from "@/lib/cms/edit-targets";
import type {
  Archive01FeatureSection,
  ProductRailSection,
} from "@/lib/cms/sections";
import type { CatalogProduct } from "@/lib/catalog/queries";

/**
 * Data-driven product sections, in the cement design.
 *
 * Products are resolved by the page and passed in, so these stay presentational
 * and testable. Ordering is the curated order from Studio, not database order
 * (Master Spec §14.3.1A).
 */

const SMALL = "text-xs font-semibold uppercase tracking-[0.14em]";

/** The line-up: the pieces, on pale cement. */
export function ProductRail({
  section,
  products,
  editing,
}: {
  section: ProductRailSection;
  products: CatalogProduct[];
  editing?: boolean;
}) {
  // An empty rail renders nothing rather than an empty heading with a void
  // under it. While editing it says why it is missing, so the owner is not
  // left wondering where a section went.
  if (products.length === 0) {
    return editing ? (
      <EditOnlyNotice
        title={section.heading || "Product line-up"}
        body="Hidden on the live site until there are live products to show. Add one in Studio → Products."
        edit={editAttrs(editing, section, "productHandles")}
      />
    ) : null;
  }

  return (
    <section
      className="pale px-4 pb-24 pt-[88px] lg:px-[72px] lg:pb-32 lg:pt-[120px]"
      data-tone="light"
    >
      <div className="mb-10 flex items-end justify-between gap-4">
        <Poster
          text={section.heading}
          className="min-w-0 flex-1"
          cap="24cqi"
          max="10.5rem"
          fill="60vh"
          edit={editAttrs(editing, section, "heading")}
        />
        <div className="flex-none pb-1">
          <Cta cta={section.viewAll} variant="text" edit={editAttrs(editing, section, "viewAll")} />
        </div>
      </div>
      <div
        {...editAttrs(editing, section, "productHandles")}
        className="grid border-t-[1.5px] border-pale-ink lg:grid-cols-3 lg:gap-7 lg:border-t-0"
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} tone="pale" />
        ))}
      </div>
    </section>
  );
}

/**
 * FROM THE ARCHIVE — the Archive 01 storefront module, on black.
 *
 * Locked treatment (Master Spec §14.3.0): three across on a computer, stacked
 * on a phone, restrained and historical. Absolutely NO sale, clearance,
 * percentage-off, countdown, urgency or bargain-bin language — this is a finite
 * sell-through of genuine early inventory, not a discount page.
 *
 * Prices are derived from commerce data. The whole module can be disabled from
 * Studio without deleting products or code.
 */
export function Archive01Feature({
  section,
  products,
  editing,
}: {
  section: Archive01FeatureSection;
  products: CatalogProduct[];
  editing?: boolean;
}) {
  if (products.length === 0) {
    return editing ? (
      <EditOnlyNotice
        title={section.headline || "From the archive"}
        body="Hidden on the live site until its Archive 01 products are live. Add them in Studio → Products."
        edit={editAttrs(editing, section, "productHandles")}
      />
    ) : null;
  }

  return (
    <section
      className="bg-surface px-4 pb-24 pt-[88px] text-ink lg:px-[72px] lg:pb-32 lg:pt-[120px]"
      data-tone="dark"
    >
      <header className="mb-10">
        <Poster
          text={section.headline}
          cap="24cqi"
          max="10.5rem"
          fill="60vh"
          edit={editAttrs(editing, section, "headline")}
        />
        <p
          {...editAttrs(editing, section, "supportingLine")}
          className={`${SMALL} mt-5 text-ink-muted`}
        >
          {section.supportingLine}
        </p>
      </header>

      <div
        {...editAttrs(editing, section, "productHandles")}
        className="grid border-t-[1.5px] border-ink/25 lg:grid-cols-3 lg:gap-7 lg:border-t-0"
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} tone="dark" />
        ))}
      </div>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-5">
        <p {...editAttrs(editing, section, "footnote")} className={`${SMALL} text-ink-muted`}>
          {section.footnote}
        </p>
        <Cta cta={section.cta} tone="on-dark" edit={editAttrs(editing, section, "cta")} />
      </footer>
    </section>
  );
}

/**
 * What an editor sees where a product section would be, when it has nothing
 * to show yet. Never rendered for customers.
 */
function EditOnlyNotice({
  title,
  body,
  edit,
}: {
  title: string;
  body: string;
  edit: Record<string, string>;
}) {
  return (
    <section data-be-empty="" className="bg-surface px-4 py-12 lg:px-[72px]" data-tone="dark">
      <div {...edit} className="border border-dashed border-line-strong px-6 py-8 text-center">
        <p className="label text-ink-muted">{title}</p>
        <p className="mt-3 text-sm text-ink-subtle">{body}</p>
      </div>
    </section>
  );
}

import Link from "next/link";

import { ProductCard, formatPrice } from "@/components/storefront/product-card";
import { MediaSlot } from "@/components/ui/media-slot";
import { Cta } from "@/components/sections";
import { mainPhoto, photoSlot } from "@/lib/catalog/photos";
import { editAttrs } from "@/lib/cms/edit-targets";
import type {
  Archive01FeatureSection,
  ProductRailSection,
} from "@/lib/cms/sections";
import type { CatalogProduct } from "@/lib/catalog/queries";

/**
 * Data-driven product sections.
 *
 * Products are resolved by the page and passed in, so these stay presentational
 * and testable. Ordering is the curated order from Studio, not database order
 * (Master Spec §14.3.1A).
 */

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
        title={section.heading || "Product rail"}
        body="Hidden on the live site until there are active products to show."
        edit={editAttrs(editing, section, "productHandles")}
      />
    ) : null;
  }

  return (
    <section className="shell py-section">
      <div className="flex items-baseline justify-between gap-6">
        <h2 {...editAttrs(editing, section, "heading")} className="label text-ink">
          {section.heading}
        </h2>
        <Cta
          cta={section.viewAll}
          variant="underline"
          edit={editAttrs(editing, section, "viewAll")}
        />
      </div>
      <div
        {...editAttrs(editing, section, "productHandles")}
        className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4"
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

/**
 * FROM THE ARCHIVE — the Archive 01 storefront module.
 *
 * Locked treatment (Master Spec §14.3.0): three-card editorial row on desktop,
 * stacked on mobile, restrained and historical. Absolutely NO sale, clearance,
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
        body="Hidden on the live site until its Archive 01 products are active."
        edit={editAttrs(editing, section, "productHandles")}
      />
    ) : null;
  }

  return (
    <section className="border-y border-line bg-void py-section">
      <div className="shell">
        <header className="text-center">
          <h2
            {...editAttrs(editing, section, "headline")}
            className="font-display text-display-md uppercase text-ink-strong"
          >
            {section.headline}
          </h2>
          <p
            {...editAttrs(editing, section, "supportingLine")}
            className="label mt-5 text-ink-muted"
          >
            {section.supportingLine}
          </p>
          <Divider />
        </header>

        <div
          {...editAttrs(editing, section, "productHandles")}
          className="mt-14 grid gap-4 md:grid-cols-3"
        >
          {products.map((product) => (
            <ArchiveCard key={product.id} product={product} />
          ))}
        </div>

        <footer className="mt-14 flex flex-col items-center gap-7 border-t border-line-faint pt-12">
          <p {...editAttrs(editing, section, "footnote")} className="label text-ink-muted">
            {section.footnote}
          </p>
          <Cta cta={section.cta} edit={editAttrs(editing, section, "cta")} />
        </footer>
      </div>
    </section>
  );
}

function ArchiveCard({ product }: { product: CatalogProduct }) {
  const prices = product.variants.map((v) => v.priceCents);
  const fromCents = prices.length > 0 ? Math.min(...prices) : null;
  const currency = product.variants[0]?.currency ?? "USD";
  const isBundle = product.kind === "bundle";

  return (
    // Underglow: each piece stands on a lit shelf (globals.css, glow-shelf).
    <article className="glow-shelf hairline group flex flex-col bg-surface-raised">
      <div className="relative">
        <MediaSlot
          media={photoSlot(mainPhoto(product.photos), product.title)}
          sizes="(min-width: 768px) 33vw, 100vw"
          className="aspect-square w-full"
        />
        <span aria-hidden="true" className="glow-shelf-rise" />
      </div>
      <div className="flex flex-1 flex-col p-7">
        <p className="label text-ink-subtle">Archive 01</p>
        <h3 className="mt-4 font-display text-display-sm uppercase text-ink-strong">
          {product.title}
        </h3>
        <div className="mt-5 h-px w-10 bg-line-strong" />
        {fromCents !== null ? (
          <p className="mt-5 text-lg text-ink">
            {formatPrice(fromCents, currency)}
          </p>
        ) : null}
        <div className="mt-auto pt-7">
          <Link
            href={`/products/${product.handle}`}
            className="label group/link inline-flex items-center gap-3 border-b border-line-strong pb-2 text-ink transition-colors hover:border-accent hover:text-accent-strong"
          >
            {isBundle ? "View bundle" : "View product"}
            <span
              aria-hidden="true"
              className="transition-transform duration-[var(--animate-duration-base)] group-hover/link:translate-x-1"
            >
              &rarr;
            </span>
          </Link>
        </div>
      </div>
      <span aria-hidden="true" className="glow-shelf-light" />
    </article>
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
    <section data-be-empty="" className="shell py-12">
      <div {...edit} className="border border-dashed border-line-strong px-6 py-8 text-center">
        <p className="label text-ink-muted">{title}</p>
        <p className="mt-3 text-sm text-ink-subtle">{body}</p>
      </div>
    </section>
  );
}

/** The four-point sparkle divider from the approved Archive treatment. */
function Divider() {
  return (
    <div className="mt-8 flex items-center justify-center gap-5" aria-hidden="true">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-line-strong" />
      <span className="text-ink-muted">&#10022;</span>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-line-strong" />
    </div>
  );
}

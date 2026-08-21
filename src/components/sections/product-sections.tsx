import Link from "next/link";

import { ProductCard, formatPrice } from "@/components/storefront/product-card";
import { MediaSlot } from "@/components/ui/media-slot";
import { Cta } from "@/components/sections";
import { emptyMedia } from "@/lib/cms/sections";
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
}: {
  section: ProductRailSection;
  products: CatalogProduct[];
}) {
  // An empty rail renders nothing rather than an empty heading with a void
  // under it.
  if (products.length === 0) return null;

  return (
    <section className="shell py-section">
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="label text-ink">{section.heading}</h2>
        <Cta cta={section.viewAll} variant="underline" />
      </div>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
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
}: {
  section: Archive01FeatureSection;
  products: CatalogProduct[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="border-y border-line bg-void py-section">
      <div className="shell">
        <header className="text-center">
          <h2 className="font-display text-display-md uppercase text-ink-strong">
            {section.headline}
          </h2>
          <p className="label mt-5 text-ink-muted">{section.supportingLine}</p>
          <Divider />
        </header>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {products.map((product) => (
            <ArchiveCard key={product.id} product={product} />
          ))}
        </div>

        <footer className="mt-14 flex flex-col items-center gap-7 border-t border-line-faint pt-12">
          <p className="label text-ink-muted">{section.footnote}</p>
          <Cta cta={section.cta} />
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
    <article className="hairline group flex flex-col bg-surface-raised">
      <MediaSlot
        media={emptyMedia(product.title, product.title)}
        sizes="(min-width: 768px) 33vw, 100vw"
        className="aspect-square w-full"
      />
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
    </article>
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

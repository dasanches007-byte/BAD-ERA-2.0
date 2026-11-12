import Link from "next/link";

import { CardAction } from "@/components/storefront/add-to-bag";
import { CardPhoto } from "@/components/storefront/card-photo";
import { STOCK_STATE_LABEL } from "@/lib/inventory/availability";
import type { CatalogProduct } from "@/lib/catalog/queries";

/**
 * A piece in a line-up (cement design): its photo on a card, its name in the
 * poster voice, its price, and one button.
 *
 * On a phone a piece is a row — photo beside the name — so a line-up reads
 * down the screen instead of squeezing three cards across it. From a tablet
 * up it is a column in a three-across grid.
 *
 * Price comes from commerce data, never from duplicated editable copy
 * (Master Spec §14.3.1A). Availability comes from server-derived stock state.
 * The card carries no hover-only information, so it works identically on
 * touch (Master Spec §4.1). Its photo can be zoomed without leaving the
 * line-up (`CardPhoto`).
 *
 * `tone` is the cement it sits on: pale for the line-ups and the Shop page,
 * dark for the archive.
 */
export function ProductCard({
  product,
  tone = "pale",
  archiveLabel = "Archive 01",
  sizes = "(min-width: 1024px) 30vw, 44vw",
}: {
  product: CatalogProduct;
  tone?: "pale" | "dark";
  /** Shown above the name of Archive 01 pieces. The owner's words. */
  archiveLabel?: string;
  sizes?: string;
}) {
  // Display price is the lowest active variant price.
  const prices = product.variants.map((v) => v.priceCents);
  const fromCents = prices.length > 0 ? Math.min(...prices) : null;
  const currency = product.variants[0]?.currency ?? "USD";

  // Card-level state is the best state across variants: a product is only
  // "sold out" when nothing in it can be bought.
  const purchasable = product.variants.some((v) => v.purchasable);
  const single = product.variants.length === 1 ? product.variants[0] : undefined;
  // Sold out is said once, on the button; a single piece that can be bought
  // says how it stands (IN STOCK, ONLY A FEW LEFT).
  const stateLabel = purchasable && single ? STOCK_STATE_LABEL[single.stockState] : null;

  const isArchive = product.tags.some((t) => t.toLowerCase().includes("archive"));
  const pale = tone === "pale";
  const quiet = pale ? "text-pale-muted" : "text-ink-muted";
  const href = `/products/${product.handle}`;

  return (
    <article
      className={`group grid grid-cols-[44%_minmax(0,1fr)] gap-[18px] border-b-[1.5px] py-[18px] lg:grid-cols-1 lg:grid-rows-[auto_1fr] lg:gap-5 lg:border-b-0 lg:pb-6 lg:pt-0 ${
        pale ? "border-pale-ink" : "border-ink/25"
      }`}
    >
      {/* The photo zooms where it stands; the name below goes to the piece's
          page, and so does the name inside the zoom. */}
      <CardPhoto
        handle={product.handle}
        title={product.title}
        photos={product.photos}
        tone={tone}
        sizes={sizes}
      />
      {/* Across a row of cards the names line up at the top and the buttons
          along the bottom, however long each name runs. */}
      <div className="grid content-between justify-items-start gap-3 py-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          {isArchive && archiveLabel ? (
            <p className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${quiet}`}>
              {archiveLabel}
            </p>
          ) : null}
          <h3 className="poster text-balance text-[clamp(2.125rem,9.6vw,4rem)] leading-[0.88] lg:text-[clamp(2.125rem,3.6vw,3.75rem)]">
            <Link href={href}>{product.title}</Link>
          </h3>
          {product.subtitle ? <p className={`mt-2 text-xs ${quiet}`}>{product.subtitle}</p> : null}
          {fromCents !== null ? (
            <p className={`mt-2.5 text-xl font-bold tabular-nums ${quiet}`}>
              {formatPrice(fromCents, currency)}
            </p>
          ) : null}
          {stateLabel ? (
            <p className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${quiet}`}>
              {stateLabel}
            </p>
          ) : null}
        </div>
        <div className="lg:self-end">
          <CardAction
            handle={product.handle}
            title={product.title}
            variantId={single?.id}
            purchasable={purchasable}
            tone={tone}
          />
        </div>
      </div>
    </article>
  );
}

/** Money formatting. Amounts are integer cents everywhere in the system. */
export function formatPrice(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    // Whole-dollar prices read cleaner on an editorial card: $30, not $30.00.
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

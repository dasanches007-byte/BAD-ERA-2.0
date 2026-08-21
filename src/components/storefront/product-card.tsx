import Link from "next/link";

import { MediaSlot } from "@/components/ui/media-slot";
import { emptyMedia } from "@/lib/cms/sections";
import { STOCK_STATE_LABEL } from "@/lib/inventory/availability";
import type { CatalogProduct } from "@/lib/catalog/queries";

/**
 * Product card for grids and rails.
 *
 * Price comes from commerce data, never from duplicated editable copy
 * (Master Spec §14.3.1A). Availability comes from server-derived stock state.
 *
 * The card carries no hover-only information, so it works identically on touch
 * (Master Spec §4.1).
 */
export function ProductCard({
  product,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
}: {
  product: CatalogProduct;
  sizes?: string;
}) {
  // Display price is the lowest active variant price.
  const prices = product.variants.map((v) => v.priceCents);
  const fromCents = prices.length > 0 ? Math.min(...prices) : null;
  const currency = product.variants[0]?.currency ?? "USD";

  // Card-level state is the best state across variants: a product is only
  // "sold out" when nothing in it can be bought.
  const purchasable = product.variants.some((v) => v.purchasable);
  const single = product.variants.length === 1 ? product.variants[0] : null;
  const stateLabel = purchasable
    ? single
      ? STOCK_STATE_LABEL[single.stockState]
      : null
    : STOCK_STATE_LABEL.sold_out;

  const isArchive = product.tags.some((t) => t.toLowerCase().includes("archive"));

  return (
    <article className="group">
      <Link href={`/products/${product.handle}`} className="block">
        <MediaSlot
          media={emptyMedia(product.title, product.title)}
          sizes={sizes}
          className="aspect-[4/5] w-full"
        />
        <div className="mt-4 flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            {isArchive ? (
              <p className="label mb-1 text-ink-subtle">Archive 01</p>
            ) : null}
            <h3 className="truncate text-sm text-ink">{product.title}</h3>
            {product.subtitle ? (
              <p className="mt-1 truncate text-xs text-ink-subtle">
                {product.subtitle}
              </p>
            ) : null}
          </div>
          {fromCents !== null ? (
            <p className="shrink-0 text-sm text-ink">
              {formatPrice(fromCents, currency)}
            </p>
          ) : null}
        </div>
        {stateLabel ? (
          <p
            className={`label mt-2 ${purchasable ? "text-ink-subtle" : "text-state-critical"}`}
          >
            {stateLabel}
          </p>
        ) : null}
      </Link>
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

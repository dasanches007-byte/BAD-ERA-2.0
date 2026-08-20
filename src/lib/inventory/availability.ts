/**
 * Availability and stock-messaging rules.
 *
 * Pure functions with no database access, so the rules that decide what a
 * customer may buy are directly testable. Callers supply state read on the
 * server; availability is never computed from a client-supplied number
 * (Master Spec §14.4.1: "Must never be a client-computed guess").
 */

/** Per-variant inventory policy and current level. */
export type VariantStock = {
  variantId: string;
  /** False for untracked goods, where quantity is not meaningful. */
  trackInventory: boolean;
  /** Sellable quantity at the location. Null when not tracked. */
  available: number | null;
  /** Explicit oversell policy. Default OFF for stocked BAD ERA goods. */
  continueSellingWhenOutOfStock: boolean;
  /** Threshold driving low-stock messaging, not stock truth. */
  lowStockThreshold: number;
};

/** One component of a bundle, with how many units each bundle consumes. */
export type BundleComponent = {
  stock: VariantStock;
  quantityRequired: number;
};

/**
 * Customer-facing stock states.
 *
 * These are presentation only. They never change stock truth, and exact counts
 * stay private unless the owner explicitly enables them for a product
 * (Master Spec §14.3.4).
 */
export type StockState =
  | "in_stock"
  | "limited_availability"
  | "only_a_few_left"
  | "sold_out"
  | "available"; // untracked or continue-selling: purchasable, no count shown

/**
 * Sellable quantity for a single variant.
 *
 * `null` means "unbounded" — untracked, or continue-selling is on. Callers must
 * treat null as purchasable rather than coercing it to zero.
 */
export function variantSellableQuantity(stock: VariantStock): number | null {
  if (!stock.trackInventory) return null;
  if (stock.continueSellingWhenOutOfStock) return null;
  return Math.max(0, stock.available ?? 0);
}

/** Whether a variant may be added to a cart at all. */
export function isVariantPurchasable(stock: VariantStock): boolean {
  const sellable = variantSellableQuantity(stock);
  return sellable === null || sellable > 0;
}

/**
 * Sellable quantity for a bundle combination.
 *
 * `floor(min(aᵢ / qᵢ))` across tracked components that are not set to continue
 * selling. The bundle itself NEVER holds its own stock — availability is always
 * derived from the selected component variants (Master Spec §14.3.5, §14.4.3).
 *
 * For the Original Era Set that reduces to
 * `min(selected tee size available, selected bag colour available)`.
 *
 * Returns null when every component is unbounded.
 */
export function bundleSellableQuantity(
  components: readonly BundleComponent[],
): number | null {
  if (components.length === 0) return 0;

  let limit: number | null = null;

  for (const { stock, quantityRequired } of components) {
    if (quantityRequired <= 0) {
      throw new Error(
        `bundle component ${stock.variantId} has a non-positive quantityRequired`,
      );
    }

    const sellable = variantSellableQuantity(stock);
    if (sellable === null) continue; // unbounded component does not constrain

    const constrained = Math.floor(sellable / quantityRequired);
    limit = limit === null ? constrained : Math.min(limit, constrained);
  }

  return limit;
}

/** Whether a bundle combination may be added to a cart. */
export function isBundlePurchasable(
  components: readonly BundleComponent[],
): boolean {
  const sellable = bundleSellableQuantity(components);
  return sellable === null || sellable > 0;
}

/**
 * Customer-facing stock state.
 *
 * Thresholds are configurable in Studio; the defaults come from
 * Master Spec §14.3.4:
 *   > 10  IN STOCK
 *   5-10  LIMITED AVAILABILITY
 *   1-4   ONLY A FEW LEFT
 *   0     SOLD OUT
 */
export function stockState(
  sellable: number | null,
  options: { limitedAvailabilityAt?: number; onlyAFewLeftAt?: number } = {},
): StockState {
  if (sellable === null) return "available";

  const limitedAt = options.limitedAvailabilityAt ?? 10;
  const fewAt = options.onlyAFewLeftAt ?? 4;

  if (sellable <= 0) return "sold_out";
  if (sellable <= fewAt) return "only_a_few_left";
  if (sellable <= limitedAt) return "limited_availability";
  return "in_stock";
}

/** Copy for each stock state. Studio-editable later; these are the defaults. */
export const STOCK_STATE_LABEL: Record<StockState, string> = {
  in_stock: "In stock",
  limited_availability: "Limited availability",
  only_a_few_left: "Only a few left",
  sold_out: "Sold out",
  available: "Available",
};

/**
 * Clamp a requested quantity to what may actually be sold.
 *
 * Returns 0 when nothing is purchasable, so a caller can reject the line rather
 * than silently adding an unfulfillable quantity.
 */
export function clampToSellable(
  requested: number,
  sellable: number | null,
): number {
  const wanted = Math.max(0, Math.floor(requested));
  if (sellable === null) return wanted;
  return Math.min(wanted, Math.max(0, sellable));
}

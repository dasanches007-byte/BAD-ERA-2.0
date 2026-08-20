import { describe, expect, it } from "vitest";

import {
  bundleSellableQuantity,
  clampToSellable,
  isBundlePurchasable,
  isVariantPurchasable,
  stockState,
  variantSellableQuantity,
  type BundleComponent,
  type VariantStock,
} from "@/lib/inventory/availability";

/** Archive 01 defaults: tracked, never oversold. */
function stock(available: number | null, overrides: Partial<VariantStock> = {}): VariantStock {
  return {
    variantId: `v-${available}`,
    trackInventory: true,
    available,
    continueSellingWhenOutOfStock: false,
    lowStockThreshold: 5,
    ...overrides,
  };
}

function component(s: VariantStock, quantityRequired = 1): BundleComponent {
  return { stock: s, quantityRequired };
}

describe("variantSellableQuantity", () => {
  it("returns the tracked available quantity", () => {
    expect(variantSellableQuantity(stock(7))).toBe(7);
  });

  it("floors a negative level at zero", () => {
    expect(variantSellableQuantity(stock(-3))).toBe(0);
  });

  it("is unbounded when inventory is not tracked", () => {
    expect(variantSellableQuantity(stock(0, { trackInventory: false }))).toBeNull();
  });

  it("is unbounded when continue-selling is on", () => {
    expect(
      variantSellableQuantity(stock(0, { continueSellingWhenOutOfStock: true })),
    ).toBeNull();
  });
});

describe("isVariantPurchasable", () => {
  it("blocks purchase at zero when continue-selling is off", () => {
    // Master Spec §14.4.2: available <= 0 and continue_selling=false
    // => variant is not purchasable.
    expect(isVariantPurchasable(stock(0))).toBe(false);
  });

  it("allows purchase at zero when continue-selling is on", () => {
    expect(
      isVariantPurchasable(stock(0, { continueSellingWhenOutOfStock: true })),
    ).toBe(true);
  });
});

describe("bundleSellableQuantity", () => {
  it("is the minimum across components (Original Era Set)", () => {
    // 1 tee + 1 bag => min(tee size, bag colour).
    expect(bundleSellableQuantity([component(stock(3)), component(stock(8))])).toBe(3);
  });

  it("goes to zero when any required component is depleted", () => {
    // §14.3.5: if Medium reaches 0, every Medium bundle becomes unavailable.
    expect(bundleSellableQuantity([component(stock(0)), component(stock(9))])).toBe(0);
    expect(isBundlePurchasable([component(stock(0)), component(stock(9))])).toBe(false);
  });

  it("divides by quantity required per bundle", () => {
    // 7 units of a component consumed 2 at a time yields 3 bundles.
    expect(bundleSellableQuantity([component(stock(7), 2)])).toBe(3);
  });

  it("takes the tightest constraint across differing ratios", () => {
    expect(
      bundleSellableQuantity([component(stock(10), 3), component(stock(8), 2)]),
    ).toBe(3);
  });

  it("ignores unbounded components when constraining", () => {
    const unbounded = stock(0, { trackInventory: false });
    expect(bundleSellableQuantity([component(stock(4)), component(unbounded)])).toBe(4);
  });

  it("is unbounded only when every component is unbounded", () => {
    const a = stock(0, { trackInventory: false });
    const b = stock(0, { continueSellingWhenOutOfStock: true });
    expect(bundleSellableQuantity([component(a), component(b)])).toBeNull();
  });

  it("treats an empty component list as unsellable", () => {
    // A bundle with no components must never be silently purchasable.
    expect(bundleSellableQuantity([])).toBe(0);
  });

  it("rejects a non-positive quantityRequired", () => {
    expect(() => bundleSellableQuantity([component(stock(5), 0)])).toThrow(
      /non-positive quantityRequired/,
    );
  });
});

describe("stockState", () => {
  it.each([
    [50, "in_stock"],
    [11, "in_stock"],
    [10, "limited_availability"],
    [5, "limited_availability"],
    [4, "only_a_few_left"],
    [1, "only_a_few_left"],
    [0, "sold_out"],
  ] as const)("maps %i to %s", (available, expected) => {
    expect(stockState(available)).toBe(expected);
  });

  it("shows no count for unbounded stock", () => {
    expect(stockState(null)).toBe("available");
  });

  it("honours configured thresholds", () => {
    expect(stockState(20, { limitedAvailabilityAt: 25, onlyAFewLeftAt: 10 })).toBe(
      "limited_availability",
    );
  });
});

describe("clampToSellable", () => {
  it("caps a request at the sellable quantity", () => {
    expect(clampToSellable(9, 3)).toBe(3);
  });

  it("passes through when unbounded", () => {
    expect(clampToSellable(9, null)).toBe(9);
  });

  it("returns zero when nothing is sellable", () => {
    expect(clampToSellable(2, 0)).toBe(0);
  });

  it("floors fractional and negative requests", () => {
    expect(clampToSellable(2.7, 10)).toBe(2);
    expect(clampToSellable(-1, 10)).toBe(0);
  });
});

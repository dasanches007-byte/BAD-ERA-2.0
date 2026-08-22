import type { Enums } from "@/lib/db/generated.types";

/** Client-safe shapes for the Inventory & Fulfillment workspace. */

export type VariantFulfillment = {
  id: string;
  title: string;
  sku: string | null;
  inventoryMode: Enums<"inventory_mode">;
  trackInventory: boolean;
  continueSellingWhenOutOfStock: boolean;
  lowStockThreshold: number;
  available: number | null;
  locationName: string | null;
  needsMapping: boolean;
  mapping: {
    id: string;
    providerId: string;
    providerName: string;
    connectionMode: Enums<"provider_connection_mode">;
    lifecycleStatus: Enums<"provider_lifecycle_status">;
    supplierSku: string | null;
    /** Studio-only. Never pass into a storefront component. */
    supplierCostCents: number | null;
    currency: string;
    availabilityMode: Enums<"availability_mode">;
    syncStatus: Enums<"availability_sync_status">;
    stockBuffer: number;
    autoSubmit: boolean;
  } | null;
};

export type ProductFulfillment = {
  productId: string;
  title: string;
  isBundle: boolean;
  variants: VariantFulfillment[];
  providers: {
    id: string;
    name: string;
    connectionMode: Enums<"provider_connection_mode">;
    lifecycleStatus: Enums<"provider_lifecycle_status">;
  }[];
};

/**
 * Owner-facing inventory modes (Master Spec §10.4.10).
 *
 * The LABEL is primary in the UI. The enum is small supporting metadata — the
 * owner should not have to think in backend vocabulary.
 *
 * PREORDER is deferred and deliberately absent from the selector.
 */
export const INVENTORY_MODES: {
  value: Enums<"inventory_mode">;
  label: string;
  description: string;
}[] = [
  {
    value: "stocked",
    label: "I stock this",
    description: "You hold the units and ship them yourself.",
  },
  {
    value: "supplier_stocked",
    label: "Supplier stocks this",
    description: "A supplier holds stock and ships it for you.",
  },
  {
    value: "made_to_order",
    label: "Made when ordered",
    description: "Produced or decorated after a paid order.",
  },
  {
    value: "manual_supplier",
    label: "I send orders manually",
    description: "Studio creates a task; you place the order with the supplier.",
  },
  {
    value: "untracked",
    label: "Don't track quantity",
    description: "Quantity is not meaningful for this item.",
  },
];

/** Which fields are relevant per mode (Master Spec §10.4.11). */
export function fieldsForMode(mode: Enums<"inventory_mode">): {
  quantity: boolean;
  provider: boolean;
  supplierMapping: boolean;
  stockBuffer: boolean;
  autoSubmit: boolean;
} {
  switch (mode) {
    case "stocked":
      return {
        quantity: true,
        provider: false,
        supplierMapping: false,
        stockBuffer: false,
        autoSubmit: false,
      };
    case "supplier_stocked":
      return {
        quantity: false,
        provider: true,
        supplierMapping: true,
        stockBuffer: true,
        autoSubmit: true,
      };
    case "made_to_order":
      return {
        quantity: false,
        provider: true,
        supplierMapping: true,
        stockBuffer: false,
        autoSubmit: true,
      };
    case "manual_supplier":
      // No fake API or sync controls for a manual supplier.
      return {
        quantity: false,
        provider: true,
        supplierMapping: true,
        stockBuffer: false,
        autoSubmit: false,
      };
    case "untracked":
    case "preorder":
      return {
        quantity: false,
        provider: false,
        supplierMapping: false,
        stockBuffer: false,
        autoSubmit: false,
      };
  }
}

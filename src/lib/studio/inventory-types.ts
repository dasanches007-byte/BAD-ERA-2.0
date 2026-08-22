import type { Enums } from "@/lib/db/generated.types";

/**
 * Client-safe inventory shapes and label maps.
 *
 * Separate from `inventory.ts`, which is `server-only`. The inventory table is
 * a Client Component, so it imports from here.
 */

export type InventoryRow = {
  variantId: string;
  locationId: string;
  locationName: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  onHand: number;
  committed: number;
  available: number;
  lowStockThreshold: number;
  continueSellingWhenOutOfStock: boolean;
  inventoryMode: Enums<"inventory_mode">;
  trackInventory: boolean;
};

export type MovementRow = {
  id: string;
  reason: Enums<"inventory_reason">;
  deltaOnHand: number;
  deltaCommitted: number;
  previousOnHand: number | null;
  resultingOnHand: number | null;
  note: string | null;
  sourceType: string | null;
  createdAt: string;
};

/**
 * Adjustment reasons the owner may choose (Master Spec §10.3.4).
 *
 * The system-only reasons — checkout_reserve, reservation_release, order_sale —
 * are deliberately absent. `studio_adjust_inventory` rejects them in PostgreSQL
 * too, so this list is convenience, not the boundary.
 */
export const ADJUSTMENT_REASONS: {
  value: Enums<"inventory_reason">;
  label: string;
}[] = [
  { value: "stock_recount", label: "Stock recount" },
  { value: "found_stock", label: "Found stock" },
  { value: "damaged", label: "Damaged" },
  { value: "lost", label: "Lost" },
  { value: "return_restock", label: "Return restock" },
  { value: "manual_correction", label: "Manual correction" },
  { value: "order_correction", label: "Order correction" },
  { value: "initial_stock", label: "Initial stock" },
  { value: "other", label: "Other" },
];

export const REASON_LABEL: Record<string, string> = {
  initial_stock: "Initial stock",
  checkout_reserve: "Checkout reserve",
  reservation_release: "Reservation release",
  order_sale: "Order sale",
  stock_recount: "Stock recount",
  found_stock: "Found stock",
  damaged: "Damaged",
  lost: "Lost",
  return_restock: "Return restock",
  manual_correction: "Manual correction",
  order_correction: "Order correction",
  cancellation_release: "Cancellation release",
  backorder_created: "Backorder created",
  other: "Other",
};

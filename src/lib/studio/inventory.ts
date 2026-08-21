import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type { Enums } from "@/lib/db/generated.types";

/**
 * Inventory is a first-class Studio module, not a number inside the product
 * form (Master Spec §10.3.4).
 *
 * Reads run on the service-role client. The WRITE path deliberately does not:
 * it goes through the `studio_adjust_inventory` RPC, which re-verifies the
 * caller is the active Studio owner inside PostgreSQL and writes an append-only
 * movement record in the same transaction.
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

export async function listInventory(): Promise<InventoryRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("inventory_levels")
    .select(
      `on_hand, committed, available, variant_id, location_id,
       inventory_locations!inner(name),
       product_variants!inner(
         title, sku, low_stock_threshold, continue_selling_when_out_of_stock,
         inventory_mode, track_inventory, active, position,
         products!inner(id, title)
       )`,
    )
    .eq("product_variants.active", true);

  if (error) throw error;

  const rows = (data ?? []).map((row) => {
    const variant = row.product_variants as unknown as {
      title: string;
      sku: string | null;
      low_stock_threshold: number;
      continue_selling_when_out_of_stock: boolean;
      inventory_mode: Enums<"inventory_mode">;
      track_inventory: boolean;
      position: number;
      products: { id: string; title: string };
    };
    const location = row.inventory_locations as unknown as { name: string };

    return {
      variantId: row.variant_id,
      locationId: row.location_id,
      locationName: location.name,
      productId: variant.products.id,
      productTitle: variant.products.title,
      variantTitle: variant.title,
      sku: variant.sku,
      onHand: row.on_hand,
      committed: row.committed,
      available: row.available ?? 0,
      lowStockThreshold: variant.low_stock_threshold,
      continueSellingWhenOutOfStock: variant.continue_selling_when_out_of_stock,
      inventoryMode: variant.inventory_mode,
      trackInventory: variant.track_inventory,
      _position: variant.position,
    };
  });

  // Group by product, then by the variant order the owner defined — so Small,
  // Medium, Large reads in that order rather than alphabetically.
  rows.sort(
    (a, b) =>
      a.productTitle.localeCompare(b.productTitle) || a._position - b._position,
  );

  return rows.map(({ _position, ...row }) => {
    void _position;
    return row;
  });
}

export async function listMovements(
  variantId: string,
  limit = 50,
): Promise<MovementRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("inventory_movements")
    .select(
      "id, reason, delta_on_hand, delta_committed, before_state, after_state, note, source_type, created_at",
    )
    .eq("variant_id", variantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((m) => {
    // before/after are jsonb snapshots of the whole level row.
    const before = m.before_state as { on_hand?: number } | null;
    const after = m.after_state as { on_hand?: number } | null;
    return {
      id: m.id,
      reason: m.reason,
      deltaOnHand: m.delta_on_hand,
      deltaCommitted: m.delta_committed,
      previousOnHand: before?.on_hand ?? null,
      resultingOnHand: after?.on_hand ?? null,
      note: m.note,
      sourceType: m.source_type,
      createdAt: m.created_at,
    };
  });
}

/**
 * Adjustment reasons the owner may choose (Master Spec §10.3.4).
 *
 * The system-only reasons — checkout_reserve, reservation_release, order_sale —
 * are deliberately absent. `studio_adjust_inventory` rejects them in
 * PostgreSQL too, so this list is convenience, not the boundary.
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

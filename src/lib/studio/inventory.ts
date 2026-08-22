import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type { Enums } from "@/lib/db/generated.types";
import type { InventoryRow, MovementRow } from "@/lib/studio/inventory-types";

/**
 * Inventory is a first-class Studio module, not a number inside the product
 * form (Master Spec §10.3.4).
 *
 * Reads run on the service-role client. The WRITE path deliberately does not:
 * it goes through the `studio_adjust_inventory` RPC, which re-verifies the
 * caller is the active Studio owner inside PostgreSQL and writes an append-only
 * movement record in the same transaction.
 */

export type { InventoryRow, MovementRow } from "@/lib/studio/inventory-types";
export { ADJUSTMENT_REASONS, REASON_LABEL } from "@/lib/studio/inventory-types";

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

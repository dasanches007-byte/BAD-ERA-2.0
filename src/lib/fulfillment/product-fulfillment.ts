import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type { Enums } from "@/lib/db/generated.types";
import type { ProductFulfillment } from "@/lib/fulfillment/product-fulfillment-types";

/**
 * Product Editor → Inventory & Fulfillment (Master Spec §10.4.8–§10.4.13).
 *
 * A dedicated workspace, not an accordion inside General. Which fields are
 * relevant depends entirely on the inventory mode, so the read returns
 * everything the panel might need and the UI shows only what applies.
 */

export async function getProductFulfillment(
  productId: string,
): Promise<ProductFulfillment | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("products")
    .select(
      `id, title, kind,
       product_variants(
         id, title, sku, active, position, inventory_mode, fulfillment_provider_id,
         track_inventory, continue_selling_when_out_of_stock, low_stock_threshold,
         inventory_levels(available, on_hand, inventory_locations(name)),
         provider_variant_mappings(
           id, provider_id, supplier_sku, supplier_cost_cents, currency,
           availability_mode, sync_status, stock_buffer, auto_submit, active,
           fulfillment_providers(id, name, connection_mode, lifecycle_status)
         )
       )`,
    )
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: providers, error: providerError } = await db
    .from("fulfillment_providers")
    .select("id, name, connection_mode, lifecycle_status")
    .neq("lifecycle_status", "disabled")
    .order("name");

  if (providerError) throw providerError;

  const variants = ((data.product_variants ?? []) as unknown as RawVariant[])
    .filter((v) => v.active)
    .sort((a, b) => a.position - b.position)
    .map((v) => {
      const mapping = (v.provider_variant_mappings ?? []).find((m) => m.active);
      const levels = v.inventory_levels ?? [];

      // A variant that will be fulfilled by an external provider but has no
      // mapping cannot be submitted automatically. Surfacing this is what stops
      // auto-submit being enabled on a product that would fail on first order
      // (Master Spec §10.4.12).
      const externalMode =
        v.inventory_mode === "supplier_stocked" ||
        v.inventory_mode === "made_to_order" ||
        v.inventory_mode === "manual_supplier";
      const needsMapping = externalMode && !mapping;

      return {
        id: v.id,
        title: v.title,
        sku: v.sku,
        inventoryMode: v.inventory_mode,
        trackInventory: v.track_inventory,
        continueSellingWhenOutOfStock: v.continue_selling_when_out_of_stock,
        lowStockThreshold: v.low_stock_threshold,
        available: v.track_inventory
          ? levels.reduce((sum, l) => sum + (l.available ?? 0), 0)
          : null,
        locationName: levels[0]?.inventory_locations?.name ?? null,
        needsMapping,
        mapping: mapping
          ? {
              id: mapping.id,
              providerId: mapping.provider_id,
              providerName: mapping.fulfillment_providers?.name ?? "Unknown",
              connectionMode:
                mapping.fulfillment_providers?.connection_mode ?? "manual",
              lifecycleStatus:
                mapping.fulfillment_providers?.lifecycle_status ?? "draft",
              supplierSku: mapping.supplier_sku,
              supplierCostCents:
                mapping.supplier_cost_cents === null
                  ? null
                  : Number(mapping.supplier_cost_cents),
              currency: mapping.currency,
              availabilityMode: mapping.availability_mode,
              syncStatus: mapping.sync_status,
              stockBuffer: mapping.stock_buffer,
              autoSubmit: mapping.auto_submit,
            }
          : null,
      };
    });

  return {
    productId: data.id,
    title: data.title,
    isBundle: data.kind === "bundle",
    variants,
    providers: (providers ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      connectionMode: p.connection_mode,
      lifecycleStatus: p.lifecycle_status,
    })),
  };
}

type RawVariant = {
  id: string;
  title: string;
  sku: string | null;
  active: boolean;
  position: number;
  inventory_mode: Enums<"inventory_mode">;
  fulfillment_provider_id: string | null;
  track_inventory: boolean;
  continue_selling_when_out_of_stock: boolean;
  low_stock_threshold: number;
  inventory_levels: {
    available: number | null;
    on_hand: number;
    inventory_locations: { name: string } | null;
  }[] | null;
  provider_variant_mappings: {
    id: string;
    provider_id: string;
    supplier_sku: string | null;
    supplier_cost_cents: number | null;
    currency: string;
    availability_mode: Enums<"availability_mode">;
    sync_status: Enums<"availability_sync_status">;
    stock_buffer: number;
    auto_submit: boolean;
    active: boolean;
    fulfillment_providers: {
      id: string;
      name: string;
      connection_mode: Enums<"provider_connection_mode">;
      lifecycle_status: Enums<"provider_lifecycle_status">;
    } | null;
  }[] | null;
};

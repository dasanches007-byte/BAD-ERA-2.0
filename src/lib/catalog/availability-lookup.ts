import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import {
  bundleSellableQuantity,
  variantSellableQuantity,
  type BundleComponent,
  type VariantStock,
} from "@/lib/inventory/availability";

/**
 * Single source of truth for "how many of this variant can be sold right now".
 *
 * Both the storefront catalog and the cart resolve availability through here,
 * so a bundle can never be judged sellable by one path and unsellable by
 * another.
 *
 * A bundle variant holds no inventory level of its own — its availability is
 * derived from its component variants (Master Spec §14.3.5). Standalone and
 * bundle purchases draw from the same underlying pools.
 *
 * This is a fast pre-check for display and cart validation. It is NOT the
 * oversell guarantee: that lives in `reserve_checkout_inventory`, which takes
 * row locks inside a transaction (Master Spec §14.3.7).
 */

/** Policy columns needed to judge availability. */
const POLICY_COLUMNS =
  "id, track_inventory, continue_selling_when_out_of_stock, low_stock_threshold";

type PolicyRow = {
  id: string;
  track_inventory: boolean;
  continue_selling_when_out_of_stock: boolean;
  low_stock_threshold: number;
};

function toStock(row: PolicyRow, available: number | null): VariantStock {
  return {
    variantId: row.id,
    trackInventory: row.track_inventory,
    available,
    continueSellingWhenOutOfStock: row.continue_selling_when_out_of_stock,
    lowStockThreshold: row.low_stock_threshold,
  };
}

/**
 * Resolve sellable quantity for each requested variant.
 *
 * A `null` value means unbounded (untracked, or continue-selling is on). A
 * missing variant resolves to 0 rather than being omitted, so callers cannot
 * accidentally treat "unknown" as "available".
 */
export async function resolveSellableQuantities(
  variantIds: readonly string[],
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>();
  const ids = [...new Set(variantIds)];
  if (ids.length === 0) return result;

  const db = createAdminClient();

  const { data: bundleRows, error: bundleError } = await db
    .from("bundle_components")
    .select("bundle_variant_id, component_variant_id, quantity_required")
    .in("bundle_variant_id", ids);
  if (bundleError) throw bundleError;

  const componentsByBundle = new Map<
    string,
    { componentVariantId: string; quantityRequired: number }[]
  >();
  for (const row of bundleRows ?? []) {
    const list = componentsByBundle.get(row.bundle_variant_id) ?? [];
    list.push({
      componentVariantId: row.component_variant_id,
      quantityRequired: row.quantity_required,
    });
    componentsByBundle.set(row.bundle_variant_id, list);
  }

  // Every variant whose stock level and policy we need: the requested ones plus
  // any component they resolve through.
  const needed = [
    ...new Set([
      ...ids,
      ...(bundleRows ?? []).map((r) => r.component_variant_id),
    ]),
  ];

  const [{ data: policies, error: policyError }, { data: levels, error: levelError }] =
    await Promise.all([
      db.from("product_variants").select(POLICY_COLUMNS).in("id", needed),
      db.from("inventory_levels").select("variant_id, available").in("variant_id", needed),
    ]);
  if (policyError) throw policyError;
  if (levelError) throw levelError;

  const policyById = new Map(
    ((policies ?? []) as PolicyRow[]).map((p) => [p.id, p]),
  );

  // A variant may in principle be stocked at several locations; sum them.
  const availableById = new Map<string, number>();
  for (const level of levels ?? []) {
    availableById.set(
      level.variant_id,
      (availableById.get(level.variant_id) ?? 0) + (level.available ?? 0),
    );
  }

  for (const id of ids) {
    const components = componentsByBundle.get(id);

    if (components && components.length > 0) {
      const resolved: BundleComponent[] = [];
      let unresolvable = false;

      for (const component of components) {
        const policy = policyById.get(component.componentVariantId);
        if (!policy) {
          // A bundle pointing at a variant that no longer exists must never be
          // treated as sellable.
          unresolvable = true;
          break;
        }
        resolved.push({
          stock: toStock(
            policy,
            availableById.get(component.componentVariantId) ?? 0,
          ),
          quantityRequired: component.quantityRequired,
        });
      }

      result.set(id, unresolvable ? 0 : bundleSellableQuantity(resolved));
      continue;
    }

    const policy = policyById.get(id);
    if (!policy) {
      result.set(id, 0);
      continue;
    }

    result.set(
      id,
      variantSellableQuantity(toStock(policy, availableById.get(id) ?? null)),
    );
  }

  return result;
}

/**
 * Resolve the physical component variants a checkout line must reserve.
 *
 * A standalone variant resolves to itself. A bundle resolves to its components,
 * never to itself — the bundle has no stock pool (Master Spec §14.3.5).
 */
export async function resolvePhysicalComponents(
  variantId: string,
  parentQuantity: number,
): Promise<
  { componentVariantId: string; quantityPerParent: number; totalQuantity: number }[]
> {
  const db = createAdminClient();

  const { data: components, error } = await db
    .from("bundle_components")
    .select("component_variant_id, quantity_required")
    .eq("bundle_variant_id", variantId);
  if (error) throw error;

  if (components && components.length > 0) {
    return components.map((c) => ({
      componentVariantId: c.component_variant_id,
      quantityPerParent: c.quantity_required,
      totalQuantity: c.quantity_required * parentQuantity,
    }));
  }

  return [
    {
      componentVariantId: variantId,
      quantityPerParent: 1,
      totalQuantity: parentQuantity,
    },
  ];
}

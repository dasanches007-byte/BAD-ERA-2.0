import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type {
  DashboardSummary,
  LowStockRow,
  RecentOrder,
} from "@/lib/studio/dashboard-types";

/**
 * Studio dashboard reads (Master Spec §10.1).
 *
 * Every figure is derived from real records. Nothing here is seeded, estimated
 * or padded: if a number cannot be computed truthfully it is reported as
 * unavailable rather than shown as zero (Master Spec §10.4.7).
 *
 * These run on the service-role client, which bypasses RLS, so each query lists
 * its columns explicitly and never selects cost or credential columns.
 */

export type {
  DashboardSummary,
  LowStockRow,
  RecentOrder,
} from "@/lib/studio/dashboard-types";

/** Revenue over a trailing window, counted only from PAID orders. */
export async function getDashboardSummary(
  windowDays = 30,
): Promise<DashboardSummary> {
  const db = createAdminClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [paid, unfulfilled, issues, levels] = await Promise.all([
    db
      .from("orders")
      .select("total_cents, currency")
      .eq("payment_status", "paid")
      .gte("paid_at", since),
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .in("fulfillment_status", ["unfulfilled", "partial"]),
    db
      .from("fulfillment_issues")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),
    db
      .from("inventory_levels")
      .select("available, variant_id, product_variants!inner(low_stock_threshold, track_inventory, active)")
      .eq("product_variants.track_inventory", true)
      .eq("product_variants.active", true),
  ]);

  if (paid.error) throw paid.error;
  if (unfulfilled.error) throw unfulfilled.error;
  if (issues.error) throw issues.error;
  if (levels.error) throw levels.error;

  const paidRows = paid.data ?? [];
  const paidRevenueCents = paidRows.reduce((sum, r) => sum + Number(r.total_cents), 0);

  let lowStockCount = 0;
  let outOfStockCount = 0;
  for (const row of levels.data ?? []) {
    const variant = row.product_variants as unknown as {
      low_stock_threshold: number;
    } | null;
    const available = row.available ?? 0;
    if (available <= 0) outOfStockCount += 1;
    else if (available <= (variant?.low_stock_threshold ?? 0)) lowStockCount += 1;
  }

  return {
    paidRevenueCents,
    paidOrderCount: paidRows.length,
    // Multi-currency is a future concern; today every price is USD.
    currency: paidRows[0]?.currency ?? "USD",
    awaitingFulfillment: unfulfilled.count ?? 0,
    openIssues: issues.count ?? 0,
    lowStockCount,
    outOfStockCount,
  };
}

export async function getRecentOrders(limit = 8): Promise<RecentOrder[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("orders")
    .select(
      "id, order_number, customer_email, total_cents, currency, payment_status, fulfillment_status, placed_at",
    )
    .order("placed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    customerEmail: o.customer_email,
    totalCents: Number(o.total_cents),
    currency: o.currency,
    paymentStatus: o.payment_status,
    fulfillmentStatus: o.fulfillment_status,
    placedAt: o.placed_at,
  }));
}

export async function getLowStock(limit = 8): Promise<LowStockRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("inventory_levels")
    .select(
      "available, variant_id, product_variants!inner(title, sku, low_stock_threshold, track_inventory, active, products!inner(title))",
    )
    .eq("product_variants.track_inventory", true)
    .eq("product_variants.active", true)
    .order("available", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const variant = row.product_variants as unknown as {
      title: string;
      sku: string | null;
      low_stock_threshold: number;
      products: { title: string };
    };
    return {
      variantId: row.variant_id,
      productTitle: variant.products.title,
      variantTitle: variant.title,
      sku: variant.sku,
      available: row.available ?? 0,
      lowStockThreshold: variant.low_stock_threshold,
    };
  });
}

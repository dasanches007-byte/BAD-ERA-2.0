import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type { Enums } from "@/lib/db/generated.types";

/**
 * Customer-facing order reads.
 *
 * Orders render from their own immutable snapshots, never from current product
 * records (Master Spec §15.1). A price or title changing in Studio must not
 * rewrite what a customer already bought.
 *
 * NEVER expose: supplier cost, provider identity or credentials, internal
 * notes, audit rows, or raw provider errors (Master Spec §7, §10.5.8).
 */

export type CustomerOrderLine = {
  productTitle: string;
  variantTitle: string;
  options: Record<string, string>;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  isBundle: boolean;
  /** Component breakdown for bundles, so packing and returns stay unambiguous. */
  components: { title: string; quantity: number }[];
};

export type CustomerOrder = {
  orderNumber: string;
  placedAt: string;
  paidAt: string | null;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  paymentStatus: Enums<"payment_status">;
  fulfillmentStatus: Enums<"order_fulfillment_status">;
  returnStatus: Enums<"order_return_status">;
  refundStatus: Enums<"order_refund_status">;
  shippingAddress: unknown;
  lines: CustomerOrderLine[];
  shipments: {
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  }[];
};

const ORDER_COLUMNS =
  "id, order_number, placed_at, paid_at, currency, subtotal_cents, shipping_cents, tax_cents, total_cents, payment_status, fulfillment_status, return_status, refund_status, shipping_address_snapshot";

async function hydrate(orderRow: {
  id: string;
  order_number: string;
  placed_at: string;
  paid_at: string | null;
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  payment_status: Enums<"payment_status">;
  fulfillment_status: Enums<"order_fulfillment_status">;
  return_status: Enums<"order_return_status">;
  refund_status: Enums<"order_refund_status">;
  shipping_address_snapshot: unknown;
}): Promise<CustomerOrder> {
  const db = createAdminClient();

  const { data: items, error: itemsError } = await db
    .from("order_items")
    .select(
      "id, product_title_snapshot, variant_title_snapshot, options_snapshot, quantity, unit_price_cents, line_total_cents, is_bundle",
    )
    .eq("order_id", orderRow.id)
    .order("created_at");
  if (itemsError) throw itemsError;

  const itemIds = (items ?? []).map((i) => i.id);
  const componentsByItem = new Map<string, { title: string; quantity: number }[]>();

  if (itemIds.length > 0) {
    const { data: components, error: componentError } = await db
      .from("order_item_components")
      .select("order_item_id, component_title_snapshot, total_quantity")
      .in("order_item_id", itemIds);
    if (componentError) throw componentError;

    for (const component of components ?? []) {
      const list = componentsByItem.get(component.order_item_id) ?? [];
      list.push({
        title: component.component_title_snapshot,
        quantity: component.total_quantity,
      });
      componentsByItem.set(component.order_item_id, list);
    }
  }

  // Shipments are read through fulfillment groups. Provider identity stays
  // internal — the customer sees carrier and tracking only.
  const { data: groups, error: groupError } = await db
    .from("fulfillment_groups")
    .select("id")
    .eq("order_id", orderRow.id);
  if (groupError) throw groupError;

  let shipments: CustomerOrder["shipments"] = [];
  if (groups && groups.length > 0) {
    const { data: shipmentRows, error: shipmentError } = await db
      .from("shipments")
      .select("carrier, tracking_number, tracking_url, shipped_at, delivered_at")
      .in(
        "fulfillment_group_id",
        groups.map((g) => g.id),
      );
    if (shipmentError) throw shipmentError;

    shipments = (shipmentRows ?? []).map((s) => ({
      carrier: s.carrier,
      trackingNumber: s.tracking_number,
      trackingUrl: s.tracking_url,
      shippedAt: s.shipped_at,
      deliveredAt: s.delivered_at,
    }));
  }

  return {
    orderNumber: orderRow.order_number,
    placedAt: orderRow.placed_at,
    paidAt: orderRow.paid_at,
    currency: orderRow.currency,
    subtotalCents: orderRow.subtotal_cents,
    shippingCents: orderRow.shipping_cents,
    taxCents: orderRow.tax_cents,
    totalCents: orderRow.total_cents,
    paymentStatus: orderRow.payment_status,
    fulfillmentStatus: orderRow.fulfillment_status,
    returnStatus: orderRow.return_status,
    refundStatus: orderRow.refund_status,
    shippingAddress: orderRow.shipping_address_snapshot,
    lines: (items ?? []).map((item) => ({
      productTitle: item.product_title_snapshot,
      variantTitle: item.variant_title_snapshot,
      options: (item.options_snapshot ?? {}) as Record<string, string>,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      lineTotalCents: item.line_total_cents,
      isBundle: item.is_bundle,
      components: componentsByItem.get(item.id) ?? [],
    })),
    shipments,
  };
}

/**
 * Resolve the order behind a checkout, for the success page.
 *
 * Returns null while the webhook has not yet landed. The success page shows a
 * "processing confirmation" state in that case — it must NEVER create an order
 * or treat its own render as proof of payment (Master Spec §6.3).
 */
export async function getOrderForCheckout(
  checkoutSessionId: string,
): Promise<CustomerOrder | null> {
  const db = createAdminClient();

  const { data: checkout, error } = await db
    .from("checkout_sessions")
    .select("paid_order_id")
    .eq("id", checkoutSessionId)
    .maybeSingle();
  if (error) throw error;
  if (!checkout?.paid_order_id) return null;

  const { data: order, error: orderError } = await db
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", checkout.paid_order_id)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) return null;

  return hydrate(order);
}

/**
 * Fetch one order by number for a signed-in customer.
 *
 * Ownership is enforced explicitly: this runs on the service-role client, which
 * bypasses RLS, so the customer id must be matched here.
 */
export async function getCustomerOrder(
  customerId: string,
  orderNumber: string,
): Promise<CustomerOrder | null> {
  const db = createAdminClient();

  const { data: order, error } = await db
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("order_number", orderNumber)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  return hydrate(order);
}

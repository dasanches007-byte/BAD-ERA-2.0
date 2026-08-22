import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type { Enums } from "@/lib/db/generated.types";

/**
 * Studio orders workspace (Master Spec §10.3.5).
 *
 * Studio sees strictly more than a customer: fulfillment groups, provider
 * routing, payment records and supplier tasks. It still reads from the order's
 * own snapshots, so a catalog change never rewrites history.
 *
 * Status stays DECOMPOSED — payment, fulfillment, return and refund are four
 * separate fields and must never be collapsed into one badge.
 */

export type StudioOrderRow = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  placedAt: string;
  totalCents: number;
  currency: string;
  paymentStatus: Enums<"payment_status">;
  fulfillmentStatus: Enums<"order_fulfillment_status">;
  returnStatus: Enums<"order_return_status">;
  refundStatus: Enums<"order_refund_status">;
  itemCount: number;
};

export type StudioOrderDetail = StudioOrderRow & {
  customerId: string | null;
  customerPhone: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  paidAt: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  shippingAddress: Record<string, unknown>;
  lines: {
    id: string;
    productTitle: string;
    variantTitle: string;
    sku: string | null;
    options: Record<string, string>;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    isBundle: boolean;
    fulfillmentMode: Enums<"inventory_mode">;
    components: { title: string; sku: string | null; quantity: number }[];
  }[];
  fulfillmentGroups: {
    id: string;
    providerName: string;
    routingMode: Enums<"fulfillment_routing_mode">;
    canonicalStatus: Enums<"fulfillment_group_status">;
    rawProviderStatus: string | null;
    itemCount: number;
  }[];
  shipments: {
    id: string;
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: Enums<"shipment_status">;
    shippedAt: string | null;
  }[];
};

const LIST_COLUMNS =
  "id, order_number, customer_email, placed_at, total_cents, currency, payment_status, fulfillment_status, return_status, refund_status, order_items(id)";

export async function listStudioOrders(limit = 100): Promise<StudioOrderRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("orders")
    .select(LIST_COLUMNS)
    .order("placed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(toRow);
}

function toRow(o: {
  id: string;
  order_number: string;
  customer_email: string;
  placed_at: string;
  total_cents: number;
  currency: string;
  payment_status: Enums<"payment_status">;
  fulfillment_status: Enums<"order_fulfillment_status">;
  return_status: Enums<"order_return_status">;
  refund_status: Enums<"order_refund_status">;
  order_items?: { id: string }[] | null;
}): StudioOrderRow {
  return {
    id: o.id,
    orderNumber: o.order_number,
    customerEmail: o.customer_email,
    placedAt: o.placed_at,
    totalCents: Number(o.total_cents),
    currency: o.currency,
    paymentStatus: o.payment_status,
    fulfillmentStatus: o.fulfillment_status,
    returnStatus: o.return_status,
    refundStatus: o.refund_status,
    itemCount: (o.order_items ?? []).length,
  };
}

export async function getStudioOrder(
  orderId: string,
): Promise<StudioOrderDetail | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("orders")
    .select(
      `id, order_number, customer_id, customer_email, customer_phone, placed_at, paid_at,
       subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents, currency,
       payment_status, fulfillment_status, return_status, refund_status,
       stripe_checkout_session_id, stripe_payment_intent_id, shipping_address_snapshot,
       order_items(
         id, product_title_snapshot, variant_title_snapshot, sku_snapshot, options_snapshot,
         quantity, unit_price_cents, line_total_cents, is_bundle, fulfillment_mode_snapshot,
         order_item_components(component_title_snapshot, component_sku_snapshot, total_quantity)
       ),
       fulfillment_groups(
         id, routing_mode, canonical_status, raw_provider_status,
         fulfillment_providers(name),
         fulfillment_group_items(id),
         shipments(id, carrier, tracking_number, tracking_url, status, shipped_at)
       )`,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const items = (data.order_items ?? []) as unknown as RawItem[];
  const groups = (data.fulfillment_groups ?? []) as unknown as RawGroup[];

  return {
    ...toRow({ ...data, order_items: items.map((i) => ({ id: i.id })) }),
    customerId: data.customer_id,
    customerPhone: data.customer_phone,
    subtotalCents: Number(data.subtotal_cents),
    discountCents: Number(data.discount_cents),
    shippingCents: Number(data.shipping_cents),
    taxCents: Number(data.tax_cents),
    paidAt: data.paid_at,
    stripeCheckoutSessionId: data.stripe_checkout_session_id,
    stripePaymentIntentId: data.stripe_payment_intent_id,
    shippingAddress: (data.shipping_address_snapshot ?? {}) as Record<string, unknown>,
    lines: items.map((i) => ({
      id: i.id,
      productTitle: i.product_title_snapshot,
      variantTitle: i.variant_title_snapshot,
      sku: i.sku_snapshot,
      options: (i.options_snapshot ?? {}) as Record<string, string>,
      quantity: i.quantity,
      unitPriceCents: Number(i.unit_price_cents),
      lineTotalCents: Number(i.line_total_cents),
      isBundle: i.is_bundle,
      fulfillmentMode: i.fulfillment_mode_snapshot,
      components: (i.order_item_components ?? []).map((c) => ({
        title: c.component_title_snapshot,
        sku: c.component_sku_snapshot,
        quantity: c.total_quantity,
      })),
    })),
    fulfillmentGroups: groups.map((g) => ({
      id: g.id,
      providerName: g.fulfillment_providers?.name ?? "Unknown provider",
      routingMode: g.routing_mode,
      canonicalStatus: g.canonical_status,
      rawProviderStatus: g.raw_provider_status,
      itemCount: (g.fulfillment_group_items ?? []).length,
    })),
    shipments: groups.flatMap((g) =>
      (g.shipments ?? []).map((s) => ({
        id: s.id,
        carrier: s.carrier,
        trackingNumber: s.tracking_number,
        trackingUrl: s.tracking_url,
        status: s.status,
        shippedAt: s.shipped_at,
      })),
    ),
  };
}

type RawItem = {
  id: string;
  product_title_snapshot: string;
  variant_title_snapshot: string;
  sku_snapshot: string | null;
  options_snapshot: unknown;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  is_bundle: boolean;
  fulfillment_mode_snapshot: Enums<"inventory_mode">;
  order_item_components?: {
    component_title_snapshot: string;
    component_sku_snapshot: string | null;
    total_quantity: number;
  }[] | null;
};

type RawGroup = {
  id: string;
  routing_mode: Enums<"fulfillment_routing_mode">;
  canonical_status: Enums<"fulfillment_group_status">;
  raw_provider_status: string | null;
  fulfillment_providers: { name: string } | null;
  fulfillment_group_items?: { id: string }[] | null;
  shipments?: {
    id: string;
    carrier: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
    status: Enums<"shipment_status">;
    shipped_at: string | null;
  }[] | null;
};

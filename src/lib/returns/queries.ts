import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type {
  ReturnDetail,
  ReturnSummary,
  ReturnableLine,
} from "@/lib/returns/types";

/**
 * Returns reads.
 *
 * Customer-facing reads take an explicit customerId and filter on it, because
 * these run on the service-role client which bypasses RLS.
 */

export async function listStudioReturns(): Promise<ReturnSummary[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("returns")
    .select(
      `id, return_number, status, reason, requested_at, approved_at, received_at,
       orders!inner(id, order_number, customer_email),
       return_items(id)`,
    )
    .order("requested_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toSummary);
}

export async function listCustomerReturns(
  customerId: string,
): Promise<ReturnSummary[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("returns")
    .select(
      `id, return_number, status, reason, requested_at, approved_at, received_at,
       orders!inner(id, order_number, customer_email),
       return_items(id)`,
    )
    .eq("customer_id", customerId)
    .order("requested_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toSummary);
}

type RawReturn = {
  id: string;
  return_number: string;
  status: ReturnSummary["status"];
  reason: string;
  requested_at: string;
  approved_at: string | null;
  received_at: string | null;
  orders: { id: string; order_number: string; customer_email: string };
  return_items?: { id: string }[] | null;
};

function toSummary(r: unknown): ReturnSummary {
  const row = r as RawReturn;
  return {
    id: row.id,
    returnNumber: row.return_number,
    orderId: row.orders.id,
    orderNumber: row.orders.order_number,
    customerEmail: row.orders.customer_email,
    status: row.status,
    reason: row.reason,
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    receivedAt: row.received_at,
    itemCount: (row.return_items ?? []).length,
  };
}

export async function getReturn(returnId: string): Promise<ReturnDetail | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("returns")
    .select(
      `id, return_number, status, reason, customer_note, requested_at, approved_at,
       received_at,
       orders!inner(
         id, order_number, customer_email, currency, total_cents, paid_at,
         refunds(id, amount_cents, currency, status, stripe_refund_id, reason,
                 created_at, succeeded_at)
       ),
       return_items(
         id, quantity, item_condition, disposition, restocked_at, notes,
         order_items!inner(
           id, product_title_snapshot, variant_title_snapshot, sku_snapshot,
           unit_price_cents
         )
       )`,
    )
    .eq("id", returnId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const order = data.orders as unknown as {
    id: string;
    order_number: string;
    customer_email: string;
    currency: string;
    total_cents: number;
    paid_at: string | null;
    refunds: {
      id: string;
      amount_cents: number;
      currency: string;
      status: ReturnDetail["refunds"][number]["status"];
      stripe_refund_id: string | null;
      reason: string | null;
      created_at: string;
      succeeded_at: string | null;
    }[];
  };

  const items = (data.return_items ?? []) as unknown as {
    id: string;
    quantity: number;
    item_condition: ReturnDetail["items"][number]["condition"];
    disposition: ReturnDetail["items"][number]["disposition"];
    restocked_at: string | null;
    notes: string | null;
    order_items: {
      id: string;
      product_title_snapshot: string;
      variant_title_snapshot: string;
      sku_snapshot: string | null;
      unit_price_cents: number;
    };
  }[];

  const refunds = order.refunds ?? [];

  return {
    id: data.id,
    returnNumber: data.return_number,
    orderId: order.id,
    orderNumber: order.order_number,
    customerEmail: order.customer_email,
    status: data.status,
    reason: data.reason,
    customerNote: data.customer_note,
    requestedAt: data.requested_at,
    approvedAt: data.approved_at,
    receivedAt: data.received_at,
    itemCount: items.length,
    currency: order.currency,
    orderTotalCents: Number(order.total_cents),
    orderPaidAt: order.paid_at,
    items: items.map((i) => ({
      id: i.id,
      orderItemId: i.order_items.id,
      productTitle: i.order_items.product_title_snapshot,
      variantTitle: i.order_items.variant_title_snapshot,
      sku: i.order_items.sku_snapshot,
      quantity: i.quantity,
      unitPriceCents: Number(i.order_items.unit_price_cents),
      condition: i.item_condition,
      disposition: i.disposition,
      restockedAt: i.restocked_at,
      notes: i.notes,
    })),
    refunds: refunds.map((r) => ({
      id: r.id,
      amountCents: Number(r.amount_cents),
      currency: r.currency,
      status: r.status,
      stripeRefundId: r.stripe_refund_id,
      reason: r.reason,
      createdAt: r.created_at,
      succeededAt: r.succeeded_at,
    })),
    // Only SUCCEEDED refunds count. A pending one has not left the account.
    refundedCents: refunds
      .filter((r) => r.status === "succeeded")
      .reduce((sum, r) => sum + Number(r.amount_cents), 0),
  };
}

/**
 * Lines a customer may still return on an order.
 *
 * Quantities already requested on other returns are subtracted, so the same
 * unit cannot be returned twice.
 */
export async function getReturnableLines(
  customerId: string,
  orderNumber: string,
): Promise<{
  orderId: string;
  paidAt: string | null;
  fulfillmentStatus: string;
  lines: ReturnableLine[];
} | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("orders")
    .select(
      `id, paid_at, fulfillment_status, currency,
       order_items(
         id, product_title_snapshot, variant_title_snapshot, options_snapshot,
         quantity, unit_price_cents,
         return_items(quantity, returns!inner(status))
       )`,
    )
    .eq("order_number", orderNumber)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const items = (data.order_items ?? []) as unknown as {
    id: string;
    product_title_snapshot: string;
    variant_title_snapshot: string;
    options_snapshot: unknown;
    quantity: number;
    unit_price_cents: number;
    return_items: { quantity: number; returns: { status: string } }[] | null;
  }[];

  return {
    orderId: data.id,
    paidAt: data.paid_at,
    fulfillmentStatus: data.fulfillment_status,
    lines: items.map((i) => {
      // A rejected or cancelled return frees its units again.
      const spent = (i.return_items ?? [])
        .filter((r) => !["rejected", "cancelled"].includes(r.returns.status))
        .reduce((sum, r) => sum + r.quantity, 0);

      return {
        orderItemId: i.id,
        productTitle: i.product_title_snapshot,
        variantTitle: i.variant_title_snapshot,
        options: (i.options_snapshot ?? {}) as Record<string, string>,
        quantity: i.quantity,
        alreadyRequested: spent,
        returnableQuantity: Math.max(i.quantity - spent, 0),
        unitPriceCents: Number(i.unit_price_cents),
        currency: data.currency,
      };
    }),
  };
}

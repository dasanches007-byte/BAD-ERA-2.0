import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type { OrderSummary, SavedAddress } from "@/lib/account/query-types";

/**
 * Customer account reads.
 *
 * Every function takes an explicit `customerId` and filters on it. These run on
 * the service-role client, which bypasses RLS, so ownership is enforced here in
 * the query rather than assumed from the session.
 *
 * Columns are listed explicitly. Never `select("*")` on a table that carries
 * internal notes or metadata a customer must not see.
 */

export type { OrderSummary, SavedAddress } from "@/lib/account/query-types";

export async function listCustomerOrders(
  customerId: string,
  limit = 50,
): Promise<OrderSummary[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("orders")
    .select(
      "id, order_number, placed_at, total_cents, currency, payment_status, fulfillment_status, return_status, order_items(id)",
    )
    .eq("customer_id", customerId)
    .order("placed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    placedAt: o.placed_at,
    totalCents: Number(o.total_cents),
    currency: o.currency,
    paymentStatus: o.payment_status,
    fulfillmentStatus: o.fulfillment_status,
    returnStatus: o.return_status,
    itemCount: ((o.order_items ?? []) as { id: string }[]).length,
  }));
}

export async function listCustomerAddresses(
  customerId: string,
): Promise<SavedAddress[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("customer_addresses")
    .select(
      "id, label, recipient_name, company, line1, line2, city, region, postal_code, country_code, phone, is_default_shipping",
    )
    .eq("customer_id", customerId)
    .order("is_default_shipping", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    recipientName: a.recipient_name,
    company: a.company,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    region: a.region,
    postalCode: a.postal_code,
    countryCode: a.country_code,
    phone: a.phone,
    isDefaultShipping: a.is_default_shipping,
  }));
}

/** Customer-facing status wording. Operational vocabulary never leaks out. */
export const PAYMENT_LABEL: Record<string, string> = {
  pending: "Payment processing",
  paid: "Paid",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  failed: "Payment failed",
};

export const FULFILLMENT_LABEL: Record<string, string> = {
  unfulfilled: "Preparing",
  partial: "Partially shipped",
  fulfilled: "Shipped",
  cancelled: "Cancelled",
};

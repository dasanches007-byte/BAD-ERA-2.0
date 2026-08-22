import "server-only";

import { createAdminClient } from "@/lib/db/admin";

/**
 * Studio customers workspace (Master Spec §10.3.8).
 *
 * A customer's identity is never silently overwritten from an order snapshot,
 * and historical orders keep their own address and contact snapshot. This
 * module therefore reads the customer record and the order history separately
 * rather than deriving one from the other.
 *
 * Stripe secrets and full card data are never stored or shown — only safe
 * provider references.
 */

export type StudioCustomerRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  orderCount: number;
  lifetimeCents: number;
  currency: string;
  createdAt: string;
};

export type StudioCustomerDetail = StudioCustomerRow & {
  phone: string | null;
  marketingOptIn: boolean;
  hasAccount: boolean;
  addresses: {
    id: string;
    label: string | null;
    recipientName: string;
    line1: string;
    line2: string | null;
    city: string;
    region: string;
    postalCode: string;
    countryCode: string;
    isDefaultShipping: boolean;
  }[];
  orders: {
    id: string;
    orderNumber: string;
    placedAt: string;
    totalCents: number;
    currency: string;
    paymentStatus: string;
    fulfillmentStatus: string;
  }[];
};

export async function listStudioCustomers(
  limit = 100,
): Promise<StudioCustomerRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("customers")
    .select(
      "id, email, first_name, last_name, created_at, orders(total_cents, currency, payment_status)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((c) => {
    const orders = (c.orders ?? []) as {
      total_cents: number;
      currency: string;
      payment_status: string;
    }[];
    // Lifetime value counts PAID orders only. Including pending ones would
    // overstate revenue the store has not actually received.
    const paid = orders.filter((o) => o.payment_status === "paid");
    return {
      id: c.id,
      email: c.email,
      firstName: c.first_name,
      lastName: c.last_name,
      orderCount: orders.length,
      lifetimeCents: paid.reduce((sum, o) => sum + Number(o.total_cents), 0),
      currency: paid[0]?.currency ?? "USD",
      createdAt: c.created_at,
    };
  });
}

export async function getStudioCustomer(
  customerId: string,
): Promise<StudioCustomerDetail | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("customers")
    .select(
      `id, email, first_name, last_name, phone, marketing_opt_in, auth_user_id, created_at,
       customer_addresses(
         id, label, recipient_name, line1, line2, city, region, postal_code,
         country_code, is_default_shipping
       ),
       orders(
         id, order_number, placed_at, total_cents, currency, payment_status, fulfillment_status
       )`,
    )
    .eq("id", customerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const orders = (data.orders ?? []) as {
    id: string;
    order_number: string;
    placed_at: string;
    total_cents: number;
    currency: string;
    payment_status: string;
    fulfillment_status: string;
  }[];

  const addresses = (data.customer_addresses ?? []) as {
    id: string;
    label: string | null;
    recipient_name: string;
    line1: string;
    line2: string | null;
    city: string;
    region: string;
    postal_code: string;
    country_code: string;
    is_default_shipping: boolean;
  }[];

  const paid = orders.filter((o) => o.payment_status === "paid");

  return {
    id: data.id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    phone: data.phone,
    marketingOptIn: data.marketing_opt_in,
    // Whether they can sign in, which is distinct from whether they have
    // ordered — guest checkout creates a customer with no auth user.
    hasAccount: Boolean(data.auth_user_id),
    orderCount: orders.length,
    lifetimeCents: paid.reduce((sum, o) => sum + Number(o.total_cents), 0),
    currency: paid[0]?.currency ?? "USD",
    createdAt: data.created_at,
    addresses: addresses.map((a) => ({
      id: a.id,
      label: a.label,
      recipientName: a.recipient_name,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      region: a.region,
      postalCode: a.postal_code,
      countryCode: a.country_code,
      isDefaultShipping: a.is_default_shipping,
    })),
    orders: orders
      .map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        placedAt: o.placed_at,
        totalCents: Number(o.total_cents),
        currency: o.currency,
        paymentStatus: o.payment_status,
        fulfillmentStatus: o.fulfillment_status,
      }))
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt)),
  };
}

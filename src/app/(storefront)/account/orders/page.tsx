import Link from "next/link";

import { formatPrice } from "@/components/storefront/product-card";
import {
  FULFILLMENT_LABEL,
  PAYMENT_LABEL,
  listCustomerOrders,
} from "@/lib/account/queries";
import { getAccountIdentity } from "@/lib/account/session";

export const metadata = { title: "Orders", robots: { index: false } };

/** Order history (Master Spec §7): number, date, total, status, tracking state. */
export default async function AccountOrdersPage() {
  const identity = await getAccountIdentity();
  const orders = identity ? await listCustomerOrders(identity.customerId) : [];

  if (orders.length === 0) {
    return (
      <section>
        <h2 className="font-display text-display-sm text-ink-strong">Orders</h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
          You have not placed an order yet.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-display text-display-sm text-ink-strong">Orders</h2>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/account/orders/${order.orderNumber}`}
              className="flex flex-col gap-3 py-6 transition-colors hover:opacity-80 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            >
              <div className="min-w-0">
                <p className="text-sm text-ink">{order.orderNumber}</p>
                <p className="mt-1.5 text-xs text-ink-subtle">
                  {new Date(order.placedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  · {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-5">
                {/* Payment and fulfillment stay separate — never one badge. */}
                <span className="label text-ink-subtle">
                  {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
                </span>
                <span className="label text-ink-muted">
                  {FULFILLMENT_LABEL[order.fulfillmentStatus] ??
                    order.fulfillmentStatus}
                </span>
                <span className="text-sm text-ink">
                  {formatPrice(order.totalCents, order.currency)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

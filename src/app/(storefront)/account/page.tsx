import Link from "next/link";

import { formatPrice } from "@/components/storefront/product-card";
import {
  FULFILLMENT_LABEL,
  PAYMENT_LABEL,
  listCustomerOrders,
} from "@/lib/account/queries";
import { getAccountIdentity } from "@/lib/account/session";

export const metadata = { title: "Account", robots: { index: false } };

/**
 * Account overview (Master Spec §7).
 *
 * Concise: latest order, its status, and a way to get help. A signed-in visitor
 * with no customer record yet sees an honest empty state rather than an error —
 * they simply have not ordered.
 */
export default async function AccountPage() {
  const identity = await getAccountIdentity();

  if (!identity) {
    return (
      <section>
        <h2 className="font-display text-display-sm text-ink-strong">Welcome</h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
          Your orders will appear here once you have placed one.
        </p>
        <Link
          href="/shop"
          className="label mt-8 inline-flex border border-ink/70 px-8 py-4 text-ink transition-colors hover:bg-ink hover:text-inverse-ink"
        >
          Shop all
        </Link>
      </section>
    );
  }

  const orders = await listCustomerOrders(identity.customerId, 3);
  const latest = orders[0];

  return (
    <div className="space-y-12">
      <section>
        <h2 className="label text-ink-subtle">Latest order</h2>
        {latest ? (
          <Link
            href={`/account/orders/${latest.orderNumber}`}
            className="hairline mt-5 flex flex-col gap-4 bg-surface-raised p-7 transition-colors hover:border-line-strong sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm text-ink">{latest.orderNumber}</p>
              <p className="mt-2 text-xs text-ink-subtle">
                {new Date(latest.placedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · {latest.itemCount} {latest.itemCount === 1 ? "item" : "items"}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <span className="label text-ink-muted">
                {FULFILLMENT_LABEL[latest.fulfillmentStatus] ??
                  latest.fulfillmentStatus}
              </span>
              <span className="text-sm text-ink">
                {formatPrice(latest.totalCents, latest.currency)}
              </span>
            </div>
          </Link>
        ) : (
          <p className="mt-5 text-sm text-ink-muted">No orders yet.</p>
        )}
      </section>

      {orders.length > 1 ? (
        <section>
          <h2 className="label text-ink-subtle">Recent</h2>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {orders.slice(1).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="flex items-center justify-between gap-4 py-5"
                >
                  <span className="text-sm text-ink">{order.orderNumber}</span>
                  <span className="label text-ink-subtle">
                    {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="label text-ink-subtle">Need help?</h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
          Questions about an order, a return or a fit — we read every message.
        </p>
        <Link
          href="/support"
          className="label mt-6 inline-flex items-center gap-3 border-b border-line-strong pb-2 text-ink transition-colors hover:border-accent hover:text-accent-strong"
        >
          Contact support
        </Link>
      </section>
    </div>
  );
}

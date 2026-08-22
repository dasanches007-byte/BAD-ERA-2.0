import Link from "next/link";
import { notFound } from "next/navigation";

import { formatPrice } from "@/components/storefront/product-card";
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from "@/lib/account/queries";
import { getAccountIdentity } from "@/lib/account/session";
import { getCustomerOrder } from "@/lib/orders/queries";

export const metadata = { title: "Order", robots: { index: false } };
export const dynamic = "force-dynamic";

type AddressSnapshot = {
  recipient_name?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
};

/**
 * Order detail (Master Spec §7).
 *
 * Rendered entirely from the order's own immutable snapshots — a price or title
 * changing in Studio must never rewrite what the customer already bought.
 *
 * Supplier cost, provider identity, internal notes and raw provider errors are
 * never present in this data shape, so they cannot leak here.
 */
export default async function AccountOrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const identity = await getAccountIdentity();
  if (!identity) notFound();

  // Ownership is enforced in the query, not by the URL.
  const order = await getCustomerOrder(identity.customerId, orderNumber);
  if (!order) notFound();

  const address = (order.shippingAddress ?? {}) as AddressSnapshot;

  return (
    <article className="space-y-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/account/orders" className="label text-ink-subtle hover:text-ink">
            &larr; Orders
          </Link>
          <h2 className="mt-4 font-display text-display-sm text-ink-strong">
            {order.orderNumber}
          </h2>
          <p className="mt-2 text-xs text-ink-subtle">
            Placed{" "}
            {new Date(order.placedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-5">
          <span className="label text-ink-subtle">
            {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
          </span>
          <span className="label text-ink-muted">
            {FULFILLMENT_LABEL[order.fulfillmentStatus] ?? order.fulfillmentStatus}
          </span>
        </div>
      </header>

      <section>
        <h3 className="label text-ink-subtle">Items</h3>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {order.lines.map((line, index) => (
            <li key={index} className="flex justify-between gap-6 py-5">
              <div className="min-w-0">
                <p className="text-sm text-ink">{line.productTitle}</p>
                <p className="mt-1.5 text-xs text-ink-subtle">
                  {Object.entries(line.options)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ") || line.variantTitle}
                  {" · "}Qty {line.quantity}
                </p>
                {/* Bundles keep their component lines so a return can be
                    handled per piece (Master Spec §10.3.7). */}
                {line.isBundle && line.components.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-l border-line pl-4">
                    {line.components.map((c, i) => (
                      <li key={i} className="text-xs text-ink-subtle">
                        {c.title} × {c.quantity}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <span className="shrink-0 text-sm text-ink">
                {formatPrice(line.lineTotalCents, order.currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        <section>
          <h3 className="label text-ink-subtle">Shipping to</h3>
          <address className="mt-5 text-sm not-italic leading-relaxed text-ink-muted">
            {address.recipient_name}
            <br />
            {address.line1}
            {address.line2 ? (
              <>
                <br />
                {address.line2}
              </>
            ) : null}
            <br />
            {address.city}, {address.region} {address.postal_code}
            <br />
            {address.country_code}
          </address>

          {order.shipments.length > 0 ? (
            <div className="mt-8">
              <h3 className="label text-ink-subtle">Tracking</h3>
              <ul className="mt-4 space-y-3">
                {order.shipments.map((s, i) => (
                  <li key={i} className="text-sm text-ink-muted">
                    {s.carrier ?? "Carrier"} · {s.trackingNumber ?? "—"}
                    {s.trackingUrl ? (
                      <>
                        {" "}
                        <a
                          href={s.trackingUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-ink underline underline-offset-4"
                        >
                          Track
                        </a>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section>
          <h3 className="label text-ink-subtle">Summary</h3>
          <dl className="mt-5 space-y-3 text-sm">
            <Row label="Subtotal" value={formatPrice(order.subtotalCents, order.currency)} />
            <Row label="Shipping" value={formatPrice(order.shippingCents, order.currency)} />
            {order.taxCents > 0 ? (
              <Row label="Tax" value={formatPrice(order.taxCents, order.currency)} />
            ) : null}
            <div className="flex justify-between border-t border-line pt-3 text-ink">
              <dt>Total</dt>
              <dd>{formatPrice(order.totalCents, order.currency)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-muted">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

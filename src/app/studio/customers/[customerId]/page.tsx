import Link from "next/link";
import { notFound } from "next/navigation";

import {
  PageHeader,
  Panel,
  StatusChip,
  formatDateTime,
  formatMoney,
} from "@/components/studio/primitives";
import { getStudioCustomer } from "@/lib/studio/customers";

export const metadata = { title: "Customer" };

/**
 * Customer detail (Master Spec §10.3.8).
 *
 * The customer record and their order history are shown side by side but never
 * merged: a historical order keeps its own address and contact snapshot, and a
 * customer editing their profile must not appear to rewrite past orders.
 */
export default async function StudioCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const customer = await getStudioCustomer(customerId);
  if (!customer) notFound();

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Customer"
        title={name || customer.email}
        description={name ? customer.email : undefined}
        actions={
          <>
            <StatusChip tone={customer.hasAccount ? "success" : "neutral"}>
              {customer.hasAccount ? "Has account" : "Guest"}
            </StatusChip>
            {customer.marketingOptIn ? (
              <StatusChip tone="info">Subscribed</StatusChip>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Orders">
          {customer.orders.length === 0 ? (
            <p className="px-6 py-6 text-sm text-ink-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {customer.orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/studio/orders/${order.id}`}
                    className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-surface-overlay sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm text-ink">{order.orderNumber}</p>
                      <p className="mt-1 text-xs text-ink-subtle">
                        {formatDateTime(order.placedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusChip
                        tone={order.paymentStatus === "paid" ? "success" : "warning"}
                      >
                        {order.paymentStatus.replace(/_/g, " ")}
                      </StatusChip>
                      <StatusChip
                        tone={
                          order.fulfillmentStatus === "fulfilled"
                            ? "success"
                            : "neutral"
                        }
                      >
                        {order.fulfillmentStatus.replace(/_/g, " ")}
                      </StatusChip>
                      <span className="text-sm text-ink">
                        {formatMoney(order.totalCents, order.currency)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Summary">
            <dl className="space-y-3 px-6 py-5 text-sm">
              <div className="flex justify-between text-ink-muted">
                <dt>Orders</dt>
                <dd className="text-ink">{customer.orderCount}</dd>
              </div>
              <div className="flex justify-between text-ink-muted">
                <dt>Lifetime paid</dt>
                <dd className="text-ink">
                  {formatMoney(customer.lifetimeCents, customer.currency)}
                </dd>
              </div>
              <div className="flex justify-between text-ink-muted">
                <dt>Customer since</dt>
                <dd className="text-ink">{formatDateTime(customer.createdAt)}</dd>
              </div>
              {customer.phone ? (
                <div className="flex justify-between text-ink-muted">
                  <dt>Phone</dt>
                  <dd className="text-ink">{customer.phone}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>

          <Panel title="Saved addresses">
            {customer.addresses.length === 0 ? (
              <p className="px-6 py-5 text-sm text-ink-muted">None saved.</p>
            ) : (
              <ul className="divide-y divide-line">
                {customer.addresses.map((a) => (
                  <li key={a.id} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="label text-ink-subtle">
                        {a.label ?? "Address"}
                      </p>
                      {a.isDefaultShipping ? (
                        <StatusChip tone="neutral">Default</StatusChip>
                      ) : null}
                    </div>
                    <address className="mt-3 text-sm not-italic leading-relaxed text-ink-muted">
                      {a.recipientName}
                      <br />
                      {a.line1}
                      {a.line2 ? (
                        <>
                          <br />
                          {a.line2}
                        </>
                      ) : null}
                      <br />
                      {a.city}, {a.region} {a.postalCode}
                      <br />
                      {a.countryCode}
                    </address>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

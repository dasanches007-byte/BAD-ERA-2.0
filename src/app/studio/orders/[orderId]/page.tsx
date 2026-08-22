import Link from "next/link";
import { notFound } from "next/navigation";

import {
  PageHeader,
  Panel,
  StatusChip,
  formatDateTime,
  formatMoney,
} from "@/components/studio/primitives";
import { INVENTORY_MODE_LABEL } from "@/lib/studio/product-types";
import { getStudioOrder } from "@/lib/studio/orders";

export const metadata = { title: "Order" };

type AddressSnapshot = {
  recipient_name?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string | null;
};

/**
 * Order workspace (Master Spec §10.3.5).
 *
 * The order snapshot is immutable and is what renders here. Fulfillment groups
 * are shown separately from the order itself, because a provider failure
 * changes fulfillment state and can never invalidate a paid order.
 */
export default async function StudioOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getStudioOrder(orderId);
  if (!order) notFound();

  const address = order.shippingAddress as AddressSnapshot;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Order"
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.placedAt)}${
          order.paidAt ? ` · paid ${formatDateTime(order.paidAt)}` : ""
        }`}
        actions={
          <>
            <StatusChip tone={order.paymentStatus === "paid" ? "success" : "warning"}>
              {order.paymentStatus.replace(/_/g, " ")}
            </StatusChip>
            <StatusChip
              tone={order.fulfillmentStatus === "fulfilled" ? "success" : "neutral"}
            >
              {order.fulfillmentStatus.replace(/_/g, " ")}
            </StatusChip>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Items">
            <ul className="divide-y divide-line">
              {order.lines.map((line) => (
                <li key={line.id} className="px-6 py-5">
                  <div className="flex justify-between gap-6">
                    <div className="min-w-0">
                      <p className="text-sm text-ink">{line.productTitle}</p>
                      <p className="mt-1.5 text-xs text-ink-subtle">
                        {Object.entries(line.options)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ") || line.variantTitle}
                        {line.sku ? ` · ${line.sku}` : ""} · Qty {line.quantity}
                      </p>
                      {/* Bundles persist their components so packing is
                          unambiguous (Master Spec §14.3.5). */}
                      {line.components.length > 0 ? (
                        <ul className="mt-3 space-y-1 border-l border-line pl-4">
                          {line.components.map((c, i) => (
                            <li key={i} className="text-xs text-ink-subtle">
                              {c.title}
                              {c.sku ? ` · ${c.sku}` : ""} × {c.quantity}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-3">
                        <StatusChip tone="neutral">
                          {INVENTORY_MODE_LABEL[line.fulfillmentMode]}
                        </StatusChip>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm text-ink">
                      {formatMoney(line.lineTotalCents, order.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Fulfillment">
            {order.fulfillmentGroups.length === 0 ? (
              <p className="px-6 py-6 text-sm text-ink-muted">
                No fulfillment groups yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {order.fulfillmentGroups.map((group) => (
                  <li
                    key={group.id}
                    className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm text-ink">{group.providerName}</p>
                      <p className="mt-1 text-xs text-ink-subtle">
                        {group.itemCount}{" "}
                        {group.itemCount === 1 ? "item" : "items"} ·{" "}
                        {group.routingMode}
                        {/* Raw provider status is kept alongside the canonical
                            one for diagnostics (Master Spec §10.4.6). */}
                        {group.rawProviderStatus
                          ? ` · provider says "${group.rawProviderStatus}"`
                          : ""}
                      </p>
                    </div>
                    <StatusChip
                      tone={
                        group.canonicalStatus === "action_required" ||
                        group.canonicalStatus === "rejected"
                          ? "critical"
                          : group.canonicalStatus === "delivered" ||
                              group.canonicalStatus === "shipped"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {group.canonicalStatus.replace(/_/g, " ")}
                    </StatusChip>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {order.shipments.length > 0 ? (
            <Panel title="Shipments">
              <ul className="divide-y divide-line">
                {order.shipments.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm text-ink">
                      {s.carrier ?? "Carrier"} · {s.trackingNumber ?? "no tracking"}
                    </span>
                    <StatusChip tone={s.status === "delivered" ? "success" : "neutral"}>
                      {s.status}
                    </StatusChip>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Panel title="Customer">
            <div className="space-y-3 px-6 py-5 text-sm">
              <p className="text-ink">{order.customerEmail}</p>
              {order.customerPhone ? (
                <p className="text-ink-muted">{order.customerPhone}</p>
              ) : null}
              {order.customerId ? (
                <Link
                  href={`/studio/customers/${order.customerId}`}
                  className="label inline-block text-ink-muted hover:text-ink"
                >
                  View customer
                </Link>
              ) : null}
            </div>
          </Panel>

          <Panel title="Ship to">
            <address className="px-6 py-5 text-sm not-italic leading-relaxed text-ink-muted">
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
          </Panel>

          <Panel title="Payment">
            <dl className="space-y-3 px-6 py-5 text-sm">
              <Row label="Subtotal" value={formatMoney(order.subtotalCents, order.currency)} />
              {order.discountCents > 0 ? (
                <Row
                  label="Discount"
                  value={`−${formatMoney(order.discountCents, order.currency)}`}
                />
              ) : null}
              <Row label="Shipping" value={formatMoney(order.shippingCents, order.currency)} />
              <Row label="Tax" value={formatMoney(order.taxCents, order.currency)} />
              <div className="flex justify-between border-t border-line pt-3 text-ink">
                <dt>Total</dt>
                <dd>{formatMoney(order.totalCents, order.currency)}</dd>
              </div>
              {/* Safe provider references only — never a secret or card data. */}
              {order.stripePaymentIntentId ? (
                <p className="pt-2 text-xs break-all text-ink-subtle">
                  {order.stripePaymentIntentId}
                </p>
              ) : null}
            </dl>
          </Panel>
        </div>
      </div>
    </div>
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

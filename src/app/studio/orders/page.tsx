import Link from "next/link";

import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
  StatusChip,
  formatDateTime,
  formatMoney,
} from "@/components/studio/primitives";
import { listStudioOrders } from "@/lib/studio/orders";
import type { StudioOrderRow } from "@/lib/studio/orders";

export const metadata = { title: "Orders" };

export default async function StudioOrdersPage() {
  let orders: StudioOrderRow[];
  try {
    orders = await listStudioOrders();
  } catch (error) {
    console.error("[bad-era] studio orders read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Commerce" title="Orders" />
        <Panel>
          <LoadError what="orders" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Commerce"
        title="Orders"
        description="Payment, fulfillment, returns and refunds are tracked separately — never collapsed into one status."
      />
      <Panel>
        {orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            body="Orders appear here the moment Stripe confirms a payment through the verified webhook."
          />
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/studio/orders/${order.id}`}
                  className="flex flex-col gap-3 px-6 py-5 transition-colors hover:bg-surface-overlay sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{order.orderNumber}</p>
                    <p className="mt-1 truncate text-xs text-ink-subtle">
                      {order.customerEmail} · {formatDateTime(order.placedAt)} ·{" "}
                      {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                    <StatusChip
                      tone={order.paymentStatus === "paid" ? "success" : "warning"}
                    >
                      {order.paymentStatus.replace(/_/g, " ")}
                    </StatusChip>
                    <StatusChip
                      tone={
                        order.fulfillmentStatus === "fulfilled"
                          ? "success"
                          : order.fulfillmentStatus === "cancelled"
                            ? "critical"
                            : "neutral"
                      }
                    >
                      {order.fulfillmentStatus.replace(/_/g, " ")}
                    </StatusChip>
                    {order.returnStatus !== "none" ? (
                      <StatusChip tone="info">
                        return: {order.returnStatus.replace(/_/g, " ")}
                      </StatusChip>
                    ) : null}
                    {order.refundStatus !== "none" ? (
                      <StatusChip tone="warning">
                        refund: {order.refundStatus}
                      </StatusChip>
                    ) : null}
                    <span className="text-sm text-ink sm:w-20 sm:text-right">
                      {formatMoney(order.totalCents, order.currency)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

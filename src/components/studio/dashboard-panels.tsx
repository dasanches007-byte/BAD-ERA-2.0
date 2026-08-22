import Link from "next/link";

import {
  StatusChip,
  formatDateTime,
  formatMoney,
} from "@/components/studio/primitives";
import type {
  DashboardSummary,
  LowStockRow,
  RecentOrder,
} from "@/lib/studio/dashboard-types";

/**
 * Dashboard presentational panels.
 *
 * Kept out of the page file so they are reusable and can be rendered in
 * isolation for a visual pass. They receive data and render it; every read and
 * every failure decision stays in the page.
 */

export function SummaryRow({ summary }: { summary: DashboardSummary }) {
  const items = [
    {
      label: "Paid revenue · 30 days",
      value: formatMoney(summary.paidRevenueCents, summary.currency),
      detail: `${summary.paidOrderCount} paid ${summary.paidOrderCount === 1 ? "order" : "orders"}`,
    },
    {
      label: "Awaiting fulfillment",
      value: String(summary.awaitingFulfillment),
      detail: "Paid, not yet shipped",
    },
    {
      label: "Action required",
      value: String(summary.openIssues),
      detail: "Unresolved fulfillment issues",
    },
    {
      label: "Stock attention",
      value: String(summary.lowStockCount + summary.outOfStockCount),
      detail: `${summary.outOfStockCount} out, ${summary.lowStockCount} low`,
    },
  ];

  return (
    <div className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-surface-raised px-6 py-7">
          <p className="label text-ink-subtle">{item.label}</p>
          <p className="mt-4 font-display text-3xl text-ink-strong">{item.value}</p>
          <p className="mt-2 text-xs text-ink-subtle">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function RecentOrders({ orders }: { orders: RecentOrder[] }) {
  return (
    <ul className="divide-y divide-line">
      {orders.map((order) => (
        <li key={order.id}>
          {/* Stacks on small screens. A non-wrapping row here cannot compress
              below its content width and was forcing the whole console to
              scroll horizontally (Master Spec §10.5.10). */}
          <Link
            href={`/studio/orders/${order.id}`}
            className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-surface-overlay sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm text-ink">{order.orderNumber}</p>
              <p className="mt-1 truncate text-xs text-ink-subtle">
                {order.customerEmail} · {formatDateTime(order.placedAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
              {/* Payment and fulfillment stay separate: never collapse
                  operational truth into one badge (Master Spec §7.1). */}
              <StatusChip tone={order.paymentStatus === "paid" ? "success" : "warning"}>
                {order.paymentStatus.replace(/_/g, " ")}
              </StatusChip>
              <StatusChip
                tone={order.fulfillmentStatus === "fulfilled" ? "success" : "neutral"}
              >
                {order.fulfillmentStatus.replace(/_/g, " ")}
              </StatusChip>
              <span className="text-sm text-ink sm:w-20 sm:text-right">
                {formatMoney(order.totalCents, order.currency)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function LowStock({ rows }: { rows: LowStockRow[] }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => {
        const out = row.available <= 0;
        return (
          <li
            key={row.variantId}
            className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{row.productTitle}</p>
              <p className="mt-1 truncate text-xs text-ink-subtle">
                {row.variantTitle}
                {row.sku ? ` · ${row.sku}` : ""}
              </p>
            </div>
            <StatusChip tone={out ? "critical" : "warning"}>
              {out ? "Sold out" : `${row.available} left`}
            </StatusChip>
          </li>
        );
      })}
    </ul>
  );
}

export function IntegrationHealth({
  integrations,
}: {
  integrations: { name: string; configured: boolean }[];
}) {
  return (
    <ul className="divide-y divide-line">
      {integrations.map((integration) => (
        <li
          key={integration.name}
          className="flex items-center justify-between gap-4 px-6 py-4"
        >
          <span className="text-sm text-ink">{integration.name}</span>
          <StatusChip tone={integration.configured ? "success" : "neutral"}>
            {integration.configured ? "Configured" : "Not configured"}
          </StatusChip>
        </li>
      ))}
      <li className="flex items-center justify-between gap-4 px-6 py-4">
        <span className="text-sm text-ink">Pirate Ship</span>
        <StatusChip tone="info">Manual by design</StatusChip>
      </li>
    </ul>
  );
}

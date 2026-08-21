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
import {
  getDashboardSummary,
  getLowStock,
  getRecentOrders,
} from "@/lib/studio/dashboard";
import type {
  DashboardSummary,
  LowStockRow,
  RecentOrder,
} from "@/lib/studio/dashboard";

export const metadata = { title: "Home" };

/**
 * Studio dashboard (Master Spec §10.1).
 *
 * Reads are settled individually so one failing panel cannot blank the whole
 * console — but a failed read renders as a failure, never as a zero. An
 * operator acting on a fabricated "0 orders" is worse than one who knows the
 * query broke.
 */
export default async function StudioDashboardPage() {
  const [summary, orders, lowStock] = await Promise.allSettled([
    getDashboardSummary(),
    getRecentOrders(),
    getLowStock(),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Studio"
        title="Home"
        description="Everything that needs your attention, from real records only."
      />

      {summary.status === "fulfilled" ? (
        <SummaryRow summary={summary.value} />
      ) : (
        <Panel>
          <LoadError what="the store summary" />
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Recent orders"
          action={
            <Link href="/studio/orders" className="label text-ink-muted hover:text-ink">
              All orders
            </Link>
          }
        >
          {orders.status === "rejected" ? (
            <LoadError what="recent orders" />
          ) : orders.value.length === 0 ? (
            <EmptyState
              title="No orders yet"
              body="Paid orders appear here as soon as Stripe confirms payment."
            />
          ) : (
            <RecentOrders orders={orders.value} />
          )}
        </Panel>

        <Panel
          title="Low stock"
          action={
            <Link href="/studio/inventory" className="label text-ink-muted hover:text-ink">
              Inventory
            </Link>
          }
        >
          {lowStock.status === "rejected" ? (
            <LoadError what="stock levels" />
          ) : lowStock.value.length === 0 ? (
            <EmptyState
              title="Nothing tracked yet"
              body="Variants with inventory tracking appear here, lowest stock first."
            />
          ) : (
            <LowStock rows={lowStock.value} />
          )}
        </Panel>
      </div>

      <Panel title="Integrations">
        <IntegrationHealth />
      </Panel>
    </div>
  );
}

function SummaryRow({ summary }: { summary: DashboardSummary }) {
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

function RecentOrders({ orders }: { orders: RecentOrder[] }) {
  return (
    <ul className="divide-y divide-line">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/studio/orders/${order.id}`}
            className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-surface-overlay"
          >
            <div className="min-w-0">
              <p className="text-sm text-ink">{order.orderNumber}</p>
              <p className="mt-1 truncate text-xs text-ink-subtle">
                {order.customerEmail} · {formatDateTime(order.placedAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
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
              <span className="w-20 text-right text-sm text-ink">
                {formatMoney(order.totalCents, order.currency)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LowStock({ rows }: { rows: LowStockRow[] }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => {
        const out = row.available <= 0;
        return (
          <li
            key={row.variantId}
            className="flex items-center justify-between gap-4 px-6 py-4"
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

/**
 * Integration health.
 *
 * Reports whether each integration is CONFIGURED, which is checkable without a
 * network call. It deliberately does not claim "connected" — that would be an
 * unverified assertion about a third party (Master Spec §10.4.7).
 */
function IntegrationHealth() {
  const integrations = [
    { name: "Supabase", configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { name: "Stripe", configured: Boolean(process.env.STRIPE_SECRET_KEY) },
    { name: "Stripe webhook", configured: Boolean(process.env.STRIPE_WEBHOOK_SECRET) },
    { name: "Resend", configured: Boolean(process.env.RESEND_API_KEY) },
  ];

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

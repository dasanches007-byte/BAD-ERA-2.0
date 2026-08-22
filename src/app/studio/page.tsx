import Link from "next/link";

import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
} from "@/components/studio/primitives";
import {
  IntegrationHealth,
  LowStock,
  RecentOrders,
  SummaryRow,
} from "@/components/studio/dashboard-panels";
import { serverEnvStatus } from "@/lib/env/server";
import {
  getDashboardSummary,
  getLowStock,
  getRecentOrders,
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

  // Uses the validated contract rather than raw process.env, so a key that is
  // present but malformed reports as NOT configured instead of a false green.
  // Studio never claims a third party is "connected" — only that BAD ERA has it
  // configured, which is checkable without asserting something unverified.
  const envStatus = serverEnvStatus();
  const integrations = [
    { name: "Supabase", configured: envStatus.core },
    { name: "Stripe", configured: envStatus.stripe },
    { name: "Resend", configured: envStatus.resend },
  ];

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
        <IntegrationHealth integrations={integrations} />
      </Panel>
    </div>
  );
}

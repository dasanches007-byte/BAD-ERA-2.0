import Link from "next/link";

import { FulfillmentTabs } from "@/components/studio/fulfillment-tabs";
import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
  StatusChip,
  formatDateTime,
} from "@/components/studio/primitives";
import { getFulfillmentCounts, listShipments } from "@/lib/fulfillment/queries";

export const metadata = { title: "Shipments" };

export default async function ShipmentsPage() {
  let shipments, counts;
  try {
    [shipments, counts] = await Promise.all([
      listShipments(),
      getFulfillmentCounts(),
    ]);
  } catch (error) {
    console.error("[bad-era] shipments read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Fulfillment" title="Shipments" />
        <Panel>
          <LoadError what="shipments" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fulfillment"
        title="Shipments"
        description="Every shipment, whether the tracking came from you or from a provider."
      />
      <FulfillmentTabs counts={counts} />

      <Panel>
        {shipments.length === 0 ? (
          <EmptyState
            title="Nothing shipped yet"
            body="Recording tracking against a fulfillment creates a shipment here."
          />
        ) : (
          <ul className="divide-y divide-line">
            {shipments.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/studio/orders/${s.orderId}`}
                    className="text-sm text-ink transition-colors hover:text-accent-strong"
                  >
                    {s.orderNumber}
                  </Link>
                  <p className="mt-1 truncate text-xs text-ink-subtle">
                    {s.carrier ?? "Carrier"} · {s.trackingNumber ?? "no tracking"}
                    {s.shippedAt ? ` · ${formatDateTime(s.shippedAt)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusChip
                    tone={
                      s.status === "delivered"
                        ? "success"
                        : s.status === "exception" || s.status === "returned"
                          ? "critical"
                          : "neutral"
                    }
                  >
                    {s.status}
                  </StatusChip>
                  {s.trackingUrl ? (
                    <a
                      href={s.trackingUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="label text-ink-muted transition-colors hover:text-ink"
                    >
                      Track
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

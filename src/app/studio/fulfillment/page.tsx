import Link from "next/link";

import { FulfillmentTabs } from "@/components/studio/fulfillment-tabs";
import {
  LoadError,
  PageHeader,
  Panel,
} from "@/components/studio/primitives";
import { getFulfillmentCounts } from "@/lib/fulfillment/queries";

export const metadata = { title: "Fulfillment" };

export default async function FulfillmentOverviewPage() {
  let counts;
  try {
    counts = await getFulfillmentCounts();
  } catch (error) {
    console.error("[bad-era] fulfillment counts read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Commerce" title="Fulfillment" />
        <Panel>
          <LoadError what="the fulfillment queues" />
        </Panel>
      </div>
    );
  }

  const queues = [
    {
      label: "Ready to ship",
      count: counts.readyToShip,
      href: "/studio/fulfillment/ready-to-ship",
      detail: "Paid, stocked, awaiting a label",
    },
    {
      label: "Supplier orders",
      count: counts.supplierOrders,
      href: "/studio/fulfillment/supplier-orders",
      detail: "Waiting to be placed with a supplier",
    },
    {
      label: "Action required",
      count: counts.actionRequired,
      href: "/studio/fulfillment/action-required",
      detail: "Paid orders that cannot progress alone",
      urgent: true,
    },
    {
      label: "Shipped",
      count: counts.shipped,
      href: "/studio/fulfillment/shipments",
      detail: "In transit or delivered",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Commerce"
        title="Fulfillment"
        description="A paid order is durable truth. A provider problem changes fulfillment state — it never invalidates the payment."
      />
      <FulfillmentTabs counts={counts} />

      <div className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        {queues.map((queue) => (
          <Link
            key={queue.href}
            href={queue.href}
            className="bg-surface-raised px-6 py-7 transition-colors hover:bg-surface-overlay"
          >
            <p className="label text-ink-subtle">{queue.label}</p>
            <p
              className={`mt-4 font-display text-3xl ${
                queue.urgent && queue.count > 0
                  ? "text-state-critical"
                  : "text-ink-strong"
              }`}
            >
              {queue.count}
            </p>
            <p className="mt-2 text-xs text-ink-subtle">{queue.detail}</p>
          </Link>
        ))}
      </div>

      <Panel title="How fulfillment works here">
        <div className="space-y-4 px-6 py-6 text-sm leading-relaxed text-ink-muted">
          <p>
            <span className="text-ink">Stocked items</span> land in Ready to
            Ship. Copy the address into Pirate Ship, buy postage there, then
            record the tracking number here.
          </p>
          <p>
            <span className="text-ink">Manual supplier items</span> create a
            Supplier Order task. Opening the supplier&rsquo;s site changes
            nothing — only Mark as Submitted does, and it needs their reference
            number.
          </p>
          <p>
            <span className="text-ink">Submitted is not shipped.</span> Tracking
            entry is a separate step, and it is what notifies the customer.
          </p>
        </div>
      </Panel>
    </div>
  );
}

import { FulfillmentTabs } from "@/components/studio/fulfillment-tabs";
import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
} from "@/components/studio/primitives";
import { ReadyToShipCard } from "@/components/studio/ready-to-ship-card";
import { getFulfillmentCounts, listReadyToShip } from "@/lib/fulfillment/queries";

export const metadata = { title: "Ready to Ship" };

export default async function ReadyToShipPage() {
  let rows, counts;
  try {
    [rows, counts] = await Promise.all([listReadyToShip(), getFulfillmentCounts()]);
  } catch (error) {
    console.error("[bad-era] ready-to-ship read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Fulfillment" title="Ready to Ship" />
        <Panel>
          <LoadError what="the ready-to-ship queue" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fulfillment"
        title="Ready to Ship"
        description="Paid orders you stock yourself. Copy the address into Pirate Ship, buy postage, then record the tracking here."
      />
      <FulfillmentTabs counts={counts} />

      {rows.length === 0 ? (
        <Panel>
          <EmptyState
            title="Nothing waiting"
            body="Paid orders for items you stock appear here automatically."
          />
        </Panel>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <ReadyToShipCard key={row.fulfillmentGroupId} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

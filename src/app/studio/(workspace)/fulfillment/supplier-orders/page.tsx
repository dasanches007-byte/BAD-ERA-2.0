import { FulfillmentTabs } from "@/components/studio/fulfillment-tabs";
import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
} from "@/components/studio/primitives";
import { SupplierTaskCard } from "@/components/studio/supplier-task-card";
import { getFulfillmentCounts, listSupplierTasks } from "@/lib/fulfillment/queries";

export const metadata = { title: "Supplier Orders" };

export default async function SupplierOrdersPage() {
  let tasks, counts;
  try {
    [tasks, counts] = await Promise.all([
      listSupplierTasks(),
      getFulfillmentCounts(),
    ]);
  } catch (error) {
    console.error("[bad-era] supplier tasks read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Fulfillment" title="Supplier Orders" />
        <Panel>
          <LoadError what="supplier orders" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fulfillment"
        title="Supplier Orders"
        description="Manual Supplier is a first-class provider type, not a temporary workaround. These are paid orders you place with a supplier yourself."
      />
      <FulfillmentTabs counts={counts} />

      {tasks.length === 0 ? (
        <Panel>
          <EmptyState
            title="No supplier orders"
            body="A paid order for a manually supplied product creates one actionable task here."
          />
        </Panel>
      ) : (
        <ul className="space-y-4">
          {tasks.map((task) => (
            <SupplierTaskCard key={task.taskId} task={task} />
          ))}
        </ul>
      )}
    </div>
  );
}

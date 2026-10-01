import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
} from "@/components/studio/primitives";
import { InventoryTable } from "@/components/studio/inventory-table";
import { ADJUSTMENT_REASONS, listInventory } from "@/lib/studio/inventory";
import type { InventoryRow } from "@/lib/studio/inventory";

export const metadata = { title: "Inventory" };

/**
 * Inventory (Master Spec §10.3.4).
 *
 * One calm table across the whole store. This is where the owner enters the
 * real Archive 01 counts — Tee S/M/L and Crossbody Black/Red/Blue — after a
 * physical count. Those numbers are deliberately NOT seeded anywhere in this
 * repository (Master Spec §14.3.3).
 */
export default async function StudioInventoryPage() {
  let rows: InventoryRow[];
  try {
    rows = await listInventory();
  } catch (error) {
    console.error("[bad-era] inventory read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Catalog" title="Inventory" />
        <Panel>
          <LoadError what="inventory levels" />
        </Panel>
      </div>
    );
  }

  const tracked = rows.filter((row) => row.trackInventory);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Catalog"
        title="Inventory"
        description="Every adjustment records the previous quantity, the change, the reason and who made it. Nothing here is ever overwritten silently."
      />

      <Panel>
        {tracked.length === 0 ? (
          <EmptyState
            title="Nothing tracked yet"
            body="Variants with inventory tracking appear here once products exist. Enter your Archive 01 counts after a physical count — they are never seeded automatically."
          />
        ) : (
          <InventoryTable rows={tracked} reasons={ADJUSTMENT_REASONS} />
        )}
      </Panel>
    </div>
  );
}

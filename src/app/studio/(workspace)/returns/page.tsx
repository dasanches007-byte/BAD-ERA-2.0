import Link from "next/link";

import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
  StatusChip,
  formatDateTime,
} from "@/components/studio/primitives";
import { listStudioReturns } from "@/lib/returns/queries";
import { RETURN_STATUS_LABEL } from "@/lib/returns/types";
import type { ReturnSummary } from "@/lib/returns/types";

export const metadata = { title: "Returns" };

const TONE: Record<string, "success" | "warning" | "critical" | "neutral" | "info"> = {
  requested: "warning",
  approved: "info",
  in_transit: "info",
  received: "success",
  closed: "neutral",
  rejected: "critical",
  cancelled: "neutral",
};

export default async function StudioReturnsPage() {
  let returns: ReturnSummary[];
  try {
    returns = await listStudioReturns();
  } catch (error) {
    console.error("[bad-era] returns read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Commerce" title="Returns" />
        <Panel>
          <LoadError what="returns" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Commerce"
        title="Returns"
        description="Approving a return does not refund it, and refunding does not put stock back. Each is a separate, deliberate decision."
      />
      <Panel>
        {returns.length === 0 ? (
          <EmptyState
            title="No returns"
            body="Return requests from customers appear here with the order they belong to."
          />
        ) : (
          <ul className="divide-y divide-line">
            {returns.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/studio/returns/${r.id}`}
                  className="flex flex-col gap-3 px-6 py-5 transition-colors hover:bg-surface-overlay sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-ink">
                      {r.returnNumber} · {r.orderNumber}
                    </p>
                    <p className="mt-1 truncate text-xs text-ink-subtle">
                      {r.customerEmail} · {r.reason} ·{" "}
                      {formatDateTime(r.requestedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusChip tone="neutral">
                      {r.itemCount} {r.itemCount === 1 ? "item" : "items"}
                    </StatusChip>
                    <StatusChip tone={TONE[r.status] ?? "neutral"}>
                      {RETURN_STATUS_LABEL[r.status]}
                    </StatusChip>
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

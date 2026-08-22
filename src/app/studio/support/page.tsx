import Link from "next/link";

import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
  StatusChip,
  formatDateTime,
} from "@/components/studio/primitives";
import { listSupportCases } from "@/lib/support/queries";
import { SUPPORT_STATUS_LABEL } from "@/lib/support/types";
import type { SupportCaseSummary } from "@/lib/support/types";

export const metadata = { title: "Support" };

const TONE: Record<string, "success" | "warning" | "critical" | "neutral" | "info"> = {
  open: "warning",
  waiting_internal: "info",
  waiting_customer: "neutral",
  resolved: "success",
  closed: "neutral",
};

export default async function StudioSupportPage() {
  let cases: SupportCaseSummary[];
  try {
    cases = await listSupportCases();
  } catch (error) {
    console.error("[bad-era] support read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Commerce" title="Support" />
        <Panel>
          <LoadError what="support cases" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Commerce"
        title="Support"
        description="Customer messages and your internal notes are kept in separate records, so a note can never be shown to a customer."
      />
      <Panel>
        {cases.length === 0 ? (
          <EmptyState
            title="No cases"
            body="Messages customers send from their account appear here, linked to the order they are about."
          />
        ) : (
          <ul className="divide-y divide-line">
            {cases.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/studio/support/${c.id}`}
                  className="flex flex-col gap-3 px-6 py-5 transition-colors hover:bg-surface-overlay sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{c.subject}</p>
                    <p className="mt-1 truncate text-xs text-ink-subtle">
                      {c.caseNumber}
                      {c.customerEmail ? ` · ${c.customerEmail}` : ""}
                      {c.orderNumber ? ` · ${c.orderNumber}` : ""} ·{" "}
                      {formatDateTime(c.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusChip tone="neutral">
                      {c.messageCount}{" "}
                      {c.messageCount === 1 ? "message" : "messages"}
                    </StatusChip>
                    <StatusChip tone={TONE[c.status] ?? "neutral"}>
                      {SUPPORT_STATUS_LABEL[c.status]}
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

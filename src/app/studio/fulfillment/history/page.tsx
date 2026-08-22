import { FulfillmentTabs } from "@/components/studio/fulfillment-tabs";
import { IssueCard } from "@/components/studio/issue-card";
import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
} from "@/components/studio/primitives";
import { getFulfillmentCounts, listIssues } from "@/lib/fulfillment/queries";

export const metadata = { title: "History" };

/**
 * Fulfillment history (Master Spec §10.5.7).
 *
 * Resolved issues stay here permanently. Resolution never deletes the original
 * failure event — the record of what went wrong is part of the audit trail.
 */
export default async function FulfillmentHistoryPage() {
  let resolved, counts;
  try {
    [resolved, counts] = await Promise.all([
      listIssues(true),
      getFulfillmentCounts(),
    ]);
  } catch (error) {
    console.error("[bad-era] fulfillment history read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Fulfillment" title="History" />
        <Panel>
          <LoadError what="fulfillment history" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fulfillment"
        title="History"
        description="Resolved issues are kept, never deleted. What went wrong stays part of the record."
      />
      <FulfillmentTabs counts={counts} />

      {resolved.length === 0 ? (
        <Panel>
          <EmptyState
            title="No history yet"
            body="Fulfillment issues you resolve are archived here with how they were resolved."
          />
        </Panel>
      ) : (
        <ul className="space-y-4">
          {resolved.map((issue) => (
            <IssueCard key={issue.issueId} issue={issue} />
          ))}
        </ul>
      )}
    </div>
  );
}

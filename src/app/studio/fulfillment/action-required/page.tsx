import { FulfillmentTabs } from "@/components/studio/fulfillment-tabs";
import { IssueCard } from "@/components/studio/issue-card";
import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
} from "@/components/studio/primitives";
import { getFulfillmentCounts, listIssues } from "@/lib/fulfillment/queries";

export const metadata = { title: "Action Required" };

/**
 * Action Required (Master Spec §10.5.4).
 *
 * The single owner queue for unresolved fulfillment exceptions, sorted oldest
 * customer-impacting issue first.
 */
export default async function ActionRequiredPage() {
  let issues, resolved, counts;
  try {
    [issues, resolved, counts] = await Promise.all([
      listIssues(false),
      listIssues(true),
      getFulfillmentCounts(),
    ]);
  } catch (error) {
    console.error("[bad-era] issues read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Fulfillment" title="Action Required" />
        <Panel>
          <LoadError what="fulfillment issues" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fulfillment"
        title="Action Required"
        description="A provider problem never invalidates a payment. These orders are paid — they just cannot progress on their own."
      />
      <FulfillmentTabs counts={counts} />

      {issues.length === 0 ? (
        <Panel>
          <EmptyState
            title="Nothing needs you"
            body="Fulfillment exceptions appear here with the recovery actions that actually apply to them."
          />
        </Panel>
      ) : (
        <ul className="space-y-4">
          {issues.map((issue) => (
            <IssueCard key={issue.issueId} issue={issue} />
          ))}
        </ul>
      )}

      {resolved.length > 0 ? (
        <section>
          <h2 className="label mb-4 text-ink-subtle">Recently resolved</h2>
          <ul className="space-y-4">
            {resolved.slice(0, 10).map((issue) => (
              <IssueCard key={issue.issueId} issue={issue} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { StatusChip, formatDateTime } from "@/components/studio/primitives";
import {
  fulfillManuallyAction,
  resolveIssueAction,
  retrySubmissionAction,
} from "@/lib/fulfillment/actions";
import {
  ISSUE_LABEL,
  RECOVERY_LABEL,
  availableRecoveryActions,
} from "@/lib/fulfillment/types";
import type { IssueRow, RecoveryAction } from "@/lib/fulfillment/types";

/**
 * Action Required card (Master Spec §10.5.4, §10.5.6).
 *
 * Recovery actions are CONTEXTUAL. Retry is never shown for a non-retryable
 * rejection — offering it would imply the problem might resolve itself when it
 * cannot, and would waste the owner's time.
 *
 * The payment state is shown prominently and reassuringly: ACTION_REQUIRED is
 * an operational state, not a payment state. The customer has paid and that
 * fact is not in question (Master Spec §10.5.7).
 */
export function IssueCard({ issue }: { issue: IssueRow }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);
  const [manualReason, setManualReason] = useState("");
  const [showManual, setShowManual] = useState(false);

  const actions = availableRecoveryActions(issue);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, okText: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      setMessage(
        result.ok
          ? { tone: "ok", text: okText }
          : { tone: "error", text: result.message ?? "That did not work." },
      );
    });
  }

  return (
    <li className="hairline bg-surface-raised">
      <header className="flex flex-col gap-3 border-b border-line px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/studio/orders/${issue.orderId}`}
              className="text-sm text-ink transition-colors hover:text-accent-strong"
            >
              {issue.orderNumber}
            </Link>
            <StatusChip
              tone={issue.severity === "critical" ? "critical" : "warning"}
            >
              {ISSUE_LABEL[issue.issueCode] ?? issue.issueCode}
            </StatusChip>
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            {issue.providerName} · {issue.customerEmail} · opened{" "}
            {formatDateTime(issue.openedAt)}
            {issue.attemptCount > 0
              ? ` · ${issue.attemptCount} ${issue.attemptCount === 1 ? "attempt" : "attempts"}`
              : ""}
          </p>
        </div>
        {/* Payment is never in doubt because fulfillment failed. */}
        <StatusChip tone={issue.paymentStatus === "paid" ? "success" : "warning"}>
          {issue.paymentStatus === "paid" ? "Customer has paid" : issue.paymentStatus}
        </StatusChip>
      </header>

      <div className="px-6 py-5">
        <p className="text-sm leading-relaxed text-ink-muted">
          {issue.ownerSummary}
        </p>

        {issue.resolvedAt ? (
          <p className="mt-4 label text-state-success">
            Resolved {formatDateTime(issue.resolvedAt)}
            {issue.resolutionType ? ` · ${issue.resolutionType.replace(/_/g, " ")}` : ""}
          </p>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-3">
              {actions.map((action) => (
                <ActionButton
                  key={action}
                  action={action}
                  disabled={pending}
                  onClick={() => {
                    if (action === "retry") {
                      run(
                        () =>
                          retrySubmissionAction({
                            issueId: issue.issueId,
                            fulfillmentGroupId: issue.fulfillmentGroupId,
                          }),
                        "Retry started using the original submission key.",
                      );
                    } else if (action === "fulfill_manually") {
                      setShowManual((v) => !v);
                    } else if (action === "contact_supplier") {
                      // Contacting a supplier records no state change by
                      // itself (Master Spec §10.5.6).
                      setMessage({
                        tone: "ok",
                        text: "Contact details are on the provider page. Reaching out changes no state here.",
                      });
                    } else {
                      run(
                        () =>
                          resolveIssueAction({
                            issueId: issue.issueId,
                            resolutionType: action,
                          }),
                        "Issue closed and kept in history.",
                      );
                    }
                  }}
                />
              ))}
            </div>

            {showManual ? (
              <div className="mt-5 border-t border-line pt-5">
                <label
                  htmlFor={`reason-${issue.issueId}`}
                  className="label block text-ink-subtle"
                >
                  Why is this moving to manual fulfillment?
                </label>
                <input
                  id={`reason-${issue.issueId}`}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Recorded in the audit trail"
                  className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
                />
                <button
                  type="button"
                  disabled={pending || !manualReason.trim()}
                  onClick={() =>
                    run(
                      () =>
                        fulfillManuallyAction({
                          issueId: issue.issueId,
                          fulfillmentGroupId: issue.fulfillmentGroupId,
                          reason: manualReason,
                        }),
                      "Routed to manual fulfillment. The order's obligations are unchanged.",
                    )
                  }
                  className="label mt-4 border border-ink/70 px-5 py-2 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
                >
                  Confirm manual fulfillment
                </button>
              </div>
            ) : null}
          </>
        )}

        {message ? (
          <p
            aria-live="polite"
            className={`label mt-5 ${
              message.tone === "ok" ? "text-state-success" : "text-state-critical"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function ActionButton({
  action,
  disabled,
  onClick,
}: {
  action: RecoveryAction;
  disabled: boolean;
  onClick: () => void;
}) {
  const destructive = action === "cancel_refund";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`label border px-5 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        destructive
          ? "border-state-critical/40 text-state-critical hover:border-state-critical"
          : "border-line-strong text-ink-muted hover:border-ink hover:text-ink"
      }`}
    >
      {RECOVERY_LABEL[action]}
    </button>
  );
}

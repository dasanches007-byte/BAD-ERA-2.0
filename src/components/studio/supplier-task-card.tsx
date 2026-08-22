"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  StatusChip,
  formatDateTime,
  formatMoney,
} from "@/components/studio/primitives";
import { markSupplierOrderSubmittedAction } from "@/lib/fulfillment/actions";
import type { SupplierTaskRow } from "@/lib/fulfillment/types";

type Address = {
  recipient_name?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
};

/**
 * Manual Supplier Order workspace (Master Spec §10.5.2, §10.5.3).
 *
 * Non-negotiables encoded here:
 *   - Opening the supplier portal changes NO state. The link is just a link.
 *   - Mark as Submitted requires a supplier reference number.
 *   - SUBMITTED is not SHIPPED; tracking is a separate later step.
 *   - Supplier cost is shown separately from the customer total and is never
 *     confused with it.
 */
export function SupplierTaskCard({ task }: { task: SupplierTaskRow }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);
  const [copied, setCopied] = useState(false);

  const address = task.shippingAddress as Address;
  const addressText = [
    address.recipient_name,
    address.line1,
    address.line2,
    `${address.city ?? ""}, ${address.region ?? ""} ${address.postal_code ?? ""}`.trim(),
    address.country_code,
  ]
    .filter(Boolean)
    .join("\n");

  const submitted = task.status === "submitted" || task.status === "completed";

  return (
    <li className="hairline bg-surface-raised">
      <header className="flex flex-col gap-3 border-b border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/studio/orders/${task.orderId}`}
            className="text-sm text-ink transition-colors hover:text-accent-strong"
          >
            {task.orderNumber}
          </Link>
          <p className="mt-1 text-xs text-ink-subtle">
            {task.providerName} · {task.customerEmail}
            {task.orderPaidAt ? ` · paid ${formatDateTime(task.orderPaidAt)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip tone="success">Paid</StatusChip>
          <StatusChip tone={submitted ? "success" : "warning"}>
            {submitted ? "Submitted" : "Submission required"}
          </StatusChip>
        </div>
      </header>

      <div className="grid gap-6 px-6 py-5 lg:grid-cols-2">
        <div>
          <p className="label text-ink-subtle">Order with supplier</p>
          <ul className="mt-3 space-y-2">
            {task.items.map((item, i) => (
              <li key={i} className="text-sm text-ink-muted">
                {item.productTitle} — {item.variantTitle} × {item.quantity}
                {item.supplierSku ? (
                  <span className="block text-xs text-ink-subtle">
                    Supplier SKU: {item.supplierSku}
                  </span>
                ) : (
                  <span className="block text-xs text-state-warning">
                    No supplier SKU mapped
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/* Studio-only cost. Deliberately labelled as supplier cost so it is
              never mistaken for the customer's total (Master Spec §10.5.2). */}
          {task.expectedCostCents !== null ? (
            <p className="mt-4 text-xs text-ink-subtle">
              Expected supplier cost:{" "}
              {formatMoney(task.expectedCostCents, task.currency)}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="label text-ink-subtle">Ship to customer</p>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(addressText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setMessage({
                    tone: "error",
                    text: "Could not copy. Select the address manually.",
                  });
                }
              }}
              className="label text-ink-muted transition-colors hover:text-ink"
            >
              {copied ? "Copied" : "Copy address"}
            </button>
          </div>
          <address className="mt-3 text-sm not-italic leading-relaxed text-ink-muted">
            {addressText.split("\n").map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </address>
        </div>
      </div>

      {submitted ? (
        <div className="border-t border-line px-6 py-5">
          <p className="label text-ink-subtle">Submitted</p>
          <p className="mt-2 text-sm text-ink">
            Reference {task.supplierReference}
            {task.submittedAt ? ` · ${formatDateTime(task.submittedAt)}` : ""}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            Submitted is not shipped. Once the supplier provides tracking,
            record it against this order to notify the customer.
          </p>
        </div>
      ) : (
        <form
          action={(formData) => {
            setMessage(null);
            const cost = String(formData.get("actualCost") ?? "").trim();
            startTransition(async () => {
              const result = await markSupplierOrderSubmittedAction({
                taskId: task.taskId,
                fulfillmentGroupId: task.fulfillmentGroupId,
                supplierReference: String(formData.get("supplierReference") ?? ""),
                actualCostCents: cost ? Math.round(Number(cost) * 100) : null,
                notes: String(formData.get("notes") ?? ""),
              });
              setMessage(
                result.ok
                  ? { tone: "ok", text: "Recorded. This is submitted, not shipped." }
                  : { tone: "error", text: result.message },
              );
            });
          }}
          className="border-t border-line px-6 py-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label text-ink-subtle">Place the supplier order</p>
            {task.orderingUrl ? (
              // Opening the portal is not a state change. It is a plain link.
              <a
                href={task.orderingUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="label text-ink-muted transition-colors hover:text-ink"
              >
                Open supplier portal &rarr;
              </a>
            ) : (
              <span className="label text-ink-disabled">No portal configured</span>
            )}
          </div>

          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            Opening the portal changes nothing here. Record the supplier&rsquo;s
            reference number once the order is actually placed.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1.6fr_1fr_auto]">
            <input
              name="supplierReference"
              placeholder="Supplier order reference"
              required
              aria-label="Supplier order reference"
              className="border border-line-strong bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
            />
            <input
              name="actualCost"
              inputMode="decimal"
              placeholder="Actual cost"
              aria-label="Actual supplier cost"
              className="border border-line-strong bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending}
              className="label border border-ink/70 px-5 py-2 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
            >
              {pending ? "Saving…" : "Mark as submitted"}
            </button>
          </div>

          <input
            name="notes"
            placeholder="Internal notes — packaging, pack-ins, instructions (optional)"
            aria-label="Supplier notes"
            className="mt-3 w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
          />

          {message ? (
            <p
              aria-live="polite"
              className={`label mt-4 ${
                message.tone === "ok" ? "text-state-success" : "text-state-critical"
              }`}
            >
              {message.text}
            </p>
          ) : null}
        </form>
      )}
    </li>
  );
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  StatusChip,
  formatDateTime,
  formatMoney,
} from "@/components/studio/primitives";
import { refundOrderAction } from "@/lib/refunds/actions";
import {
  inspectReturnItemAction,
  restockReturnItemAction,
  transitionReturnAction,
} from "@/lib/returns/actions";
import {
  CONDITION_LABEL,
  DISPOSITION_LABEL,
  RETURN_STATUS_LABEL,
  allowedReturnTransitions,
} from "@/lib/returns/types";
import type { ReturnDetail, ReturnItemDetail } from "@/lib/returns/types";

/**
 * Return workspace (Master Spec §9.1, §10.3.7).
 *
 * Three separate decisions, presented as three separate things:
 *
 *   1. Move the return along (approve / receive / close)
 *   2. Refund money through Stripe
 *   3. Put a unit back into sellable stock
 *
 * None of them triggers another. That separation is the whole point: a damaged
 * item can be refunded without ever becoming sellable again.
 */
export function ReturnWorkspace({ detail }: { detail: ReturnDetail }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  const transitions = allowedReturnTransitions(detail.status);
  const refundable = detail.orderTotalCents - detail.refundedCents;

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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="hairline bg-surface-raised">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 className="label text-ink-subtle">Items returned</h2>
            <span className="label text-ink-disabled">
              Inspect before restocking
            </span>
          </header>
          <ul className="divide-y divide-line">
            {detail.items.map((item) => (
              <ReturnItemRow
                key={item.id}
                item={item}
                returnId={detail.id}
                currency={detail.currency}
                canRestock={
                  detail.status === "received" || detail.status === "closed"
                }
                pending={pending}
                onResult={(tone, text) => setMessage({ tone, text })}
              />
            ))}
          </ul>
        </section>

        {/* Refund is its own panel, never a side effect of approving. */}
        <section className="hairline bg-surface-raised">
          <header className="border-b border-line px-6 py-4">
            <h2 className="label text-ink-subtle">Refund</h2>
          </header>
          <div className="px-6 py-5">
            <p className="text-sm text-ink-muted">
              Order total {formatMoney(detail.orderTotalCents, detail.currency)} ·
              refunded {formatMoney(detail.refundedCents, detail.currency)} ·
              remaining{" "}
              <span className="text-ink">
                {formatMoney(refundable, detail.currency)}
              </span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Refunding sends money back through Stripe. It does not put
              anything back into stock — that is a separate decision above.
            </p>

            {detail.refunds.length > 0 ? (
              <ul className="mt-5 space-y-2 border-t border-line pt-4">
                {detail.refunds.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="text-ink-muted">
                      {formatMoney(r.amountCents, r.currency)}
                      {r.reason ? ` · ${r.reason}` : ""}
                      <span className="ml-2 text-xs text-ink-subtle">
                        {formatDateTime(r.createdAt)}
                      </span>
                    </span>
                    <StatusChip
                      tone={
                        r.status === "succeeded"
                          ? "success"
                          : r.status === "failed"
                            ? "critical"
                            : "warning"
                      }
                    >
                      {r.status}
                    </StatusChip>
                  </li>
                ))}
              </ul>
            ) : null}

            {refundable > 0 ? (
              <form
                action={(formData) => {
                  const amount = String(formData.get("amount") ?? "").trim();
                  run(
                    () =>
                      refundOrderAction({
                        orderId: detail.orderId,
                        amountCents: Math.round(Number(amount) * 100),
                        reason: String(formData.get("reason") ?? "") || undefined,
                        returnId: detail.id,
                      }),
                    "Refund sent to Stripe. Stock is unchanged.",
                  );
                }}
                className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-[1fr_1.6fr_auto]"
              >
                <input
                  name="amount"
                  inputMode="decimal"
                  required
                  placeholder={(refundable / 100).toFixed(2)}
                  aria-label="Refund amount"
                  className="border border-line-strong bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
                />
                <input
                  name="reason"
                  placeholder="Reason (recorded)"
                  aria-label="Refund reason"
                  className="border border-line-strong bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="label border border-state-critical/40 px-5 py-2 text-state-critical transition-colors hover:border-state-critical disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? "Refunding…" : "Refund"}
                </button>
              </form>
            ) : (
              <p className="mt-5 label border-t border-line pt-5 text-ink-subtle">
                Fully refunded
              </p>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <section className="hairline bg-surface-raised">
          <header className="border-b border-line px-6 py-4">
            <h2 className="label text-ink-subtle">Return</h2>
          </header>
          <dl className="space-y-3 px-6 py-5 text-sm">
            <Row label="Status" value={RETURN_STATUS_LABEL[detail.status]} />
            <Row label="Reason" value={detail.reason} />
            <Row label="Requested" value={formatDateTime(detail.requestedAt)} />
            {detail.approvedAt ? (
              <Row label="Approved" value={formatDateTime(detail.approvedAt)} />
            ) : null}
            {detail.receivedAt ? (
              <Row label="Received" value={formatDateTime(detail.receivedAt)} />
            ) : null}
          </dl>
          {detail.customerNote ? (
            <div className="border-t border-line px-6 py-5">
              <p className="label text-ink-subtle">Customer note</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {detail.customerNote}
              </p>
            </div>
          ) : null}
          <div className="border-t border-line px-6 py-5">
            <Link
              href={`/studio/orders/${detail.orderId}`}
              className="label text-ink-muted transition-colors hover:text-ink"
            >
              View order {detail.orderNumber} &rarr;
            </Link>
          </div>
        </section>

        {transitions.length > 0 ? (
          <section className="hairline bg-surface-raised">
            <header className="border-b border-line px-6 py-4">
              <h2 className="label text-ink-subtle">Next step</h2>
            </header>
            <div className="flex flex-wrap gap-3 px-6 py-5">
              {transitions.map((next) => (
                <button
                  key={next}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => transitionReturnAction({ returnId: detail.id, next }),
                      `Return marked ${RETURN_STATUS_LABEL[next].toLowerCase()}. No money moved and no stock changed.`,
                    )
                  }
                  className={`label border px-4 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    next === "rejected"
                      ? "border-state-critical/40 text-state-critical hover:border-state-critical"
                      : "border-line-strong text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {RETURN_STATUS_LABEL[next]}
                </button>
              ))}
            </div>
            <p className="border-t border-line px-6 py-4 text-xs leading-relaxed text-ink-muted">
              Approving means &ldquo;send it back&rdquo;, not &ldquo;here is
              your money&rdquo;.
            </p>
          </section>
        ) : null}

        {message ? (
          <p
            aria-live="polite"
            className={`label ${
              message.tone === "ok" ? "text-state-success" : "text-state-critical"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </aside>
    </div>
  );
}

function ReturnItemRow({
  item,
  returnId,
  currency,
  canRestock,
  pending,
  onResult,
}: {
  item: ReturnItemDetail;
  returnId: string;
  currency: string;
  canRestock: boolean;
  pending: boolean;
  onResult: (tone: "ok" | "error", text: string) => void;
}) {
  const [busy, startTransition] = useTransition();
  const [condition, setCondition] = useState(item.condition);
  const [disposition, setDisposition] = useState(item.disposition);

  const damagedButRestock = condition === "damaged" && disposition === "restock";

  return (
    <li className="px-6 py-5">
      <div className="flex justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm text-ink">{item.productTitle}</p>
          <p className="mt-1 text-xs text-ink-subtle">
            {item.variantTitle}
            {item.sku ? ` · ${item.sku}` : ""} · Qty {item.quantity}
          </p>
        </div>
        <span className="shrink-0 text-sm text-ink">
          {formatMoney(item.unitPriceCents * item.quantity, currency)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label block text-ink-subtle">Condition</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as typeof condition)}
            className="mt-2 w-full border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            {Object.entries(CONDITION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label block text-ink-subtle">Disposition</label>
          <select
            value={disposition}
            onChange={(e) => setDisposition(e.target.value as typeof disposition)}
            className="mt-2 w-full border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            {Object.entries(DISPOSITION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {damagedButRestock ? (
        <p className="label mt-3 text-state-critical">
          A damaged item cannot be put back into sellable stock.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={busy || pending || damagedButRestock}
          onClick={() =>
            startTransition(async () => {
              const result = await inspectReturnItemAction({
                returnItemId: item.id,
                returnId,
                condition,
                disposition,
              });
              onResult(
                result.ok ? "ok" : "error",
                result.ok
                  ? "Inspection recorded. Stock is unchanged."
                  : result.message,
              );
            })
          }
          className="label border border-line-strong px-4 py-2 text-ink-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save inspection
        </button>

        {item.restockedAt ? (
          <StatusChip tone="success">
            Restocked {formatDateTime(item.restockedAt)}
          </StatusChip>
        ) : (
          <button
            type="button"
            disabled={
              busy || pending || !canRestock || disposition !== "restock"
            }
            onClick={() =>
              startTransition(async () => {
                const result = await restockReturnItemAction({
                  returnItemId: item.id,
                  returnId,
                });
                onResult(
                  result.ok ? "ok" : "error",
                  result.ok
                    ? "Put back into stock as an audited movement."
                    : result.message,
                );
              })
            }
            title={
              !canRestock
                ? "Mark the return received first"
                : disposition !== "restock"
                  ? "Set the disposition to restock first"
                  : undefined
            }
            className="label border border-ink/70 px-4 py-2 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
          >
            Put back into stock
          </button>
        )}
      </div>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

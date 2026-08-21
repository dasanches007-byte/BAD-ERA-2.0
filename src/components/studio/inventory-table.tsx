"use client";

import { useState, useTransition } from "react";

import { StatusChip } from "@/components/studio/primitives";
import {
  adjustInventoryAction,
  setInventoryAction,
} from "@/lib/studio/inventory-actions";
import type { InventoryRow } from "@/lib/studio/inventory";

/**
 * Inventory table (Master Spec §10.3.4).
 *
 * Columns: product, variant, SKU, Available, threshold, continue-selling,
 * fulfillment mode. Quick +/- adjustment with a reason, and explicit absolute
 * entry for a physical recount. Both create an audit record.
 *
 * On small screens the table collapses to labelled rows rather than forcing
 * horizontal scrolling (Master Spec §10.5.10).
 */
export function InventoryTable({
  rows,
  reasons,
}: {
  rows: InventoryRow[];
  reasons: { value: string; label: string }[];
}) {
  // Group by product so sizes and colourways read together.
  const groups = new Map<string, InventoryRow[]>();
  for (const row of rows) {
    const list = groups.get(row.productId) ?? [];
    list.push(row);
    groups.set(row.productId, list);
  }

  return (
    <div className="divide-y divide-line">
      {[...groups.entries()].map(([productId, productRows]) => (
        <section key={productId}>
          <header className="flex items-baseline justify-between gap-4 bg-surface-overlay px-6 py-3">
            <h3 className="text-sm text-ink">{productRows[0].productTitle}</h3>
            <span className="label text-ink-subtle">
              {productRows.length}{" "}
              {productRows.length === 1 ? "variant" : "variants"}
            </span>
          </header>
          <ul className="divide-y divide-line">
            {productRows.map((row) => (
              <InventoryRowItem
                key={`${row.variantId}-${row.locationId}`}
                row={row}
                reasons={reasons}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function InventoryRowItem({
  row,
  reasons,
}: {
  row: InventoryRow;
  reasons: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState(reasons[0]?.value ?? "manual_correction");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState("");

  function run(action: () => Promise<{ ok: boolean; message?: string; resultingOnHand?: number }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setMessage({
          tone: "ok",
          text: `Updated. On hand is now ${result.resultingOnHand}.`,
        });
        setDelta("");
        setNote("");
        setTarget("");
      } else {
        setMessage({ tone: "error", text: result.message ?? "Adjustment failed." });
      }
    });
  }

  const tone =
    row.available <= 0
      ? "critical"
      : row.available <= row.lowStockThreshold
        ? "warning"
        : "success";

  return (
    <li className="px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-ink">{row.variantTitle}</p>
          <p className="mt-1 text-xs text-ink-subtle">
            {row.sku ?? "No SKU"} · {row.locationName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusChip tone={tone}>
            {row.available <= 0 ? "Sold out" : `${row.available} available`}
          </StatusChip>
          {row.committed > 0 ? (
            <StatusChip tone="info">{row.committed} reserved</StatusChip>
          ) : null}
          {row.continueSellingWhenOutOfStock ? (
            <StatusChip tone="warning">Continue selling</StatusChip>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="label border border-line-strong px-3 py-1.5 text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            {open ? "Close" : "Adjust"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-5 grid gap-6 border-t border-line pt-5 lg:grid-cols-2">
          {/* Relative adjustment with a reason. */}
          <div>
            <p className="label text-ink-subtle">Adjust by</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="e.g. -1"
                aria-label="Adjustment amount"
                className="w-28 border border-line-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-label="Reason"
                className="border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              >
                {reasons.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              aria-label="Note"
              className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
            />
            {/* Show the resulting quantity before confirming. */}
            {delta && Number.isInteger(Number(delta)) && Number(delta) !== 0 ? (
              <p className="mt-3 text-xs text-ink-muted">
                {row.onHand} &rarr; {row.onHand + Number(delta)} on hand
              </p>
            ) : null}
            <button
              type="button"
              disabled={pending || !delta}
              onClick={() =>
                run(() =>
                  adjustInventoryAction({
                    variantId: row.variantId,
                    locationId: row.locationId,
                    delta: Number(delta),
                    reason,
                    note,
                  }),
                )
              }
              className="label mt-4 border border-ink/70 px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
            >
              {pending ? "Saving…" : "Apply adjustment"}
            </button>
          </div>

          {/* Absolute set, for a physical recount. */}
          <div>
            <p className="label text-ink-subtle">Set exact quantity</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              For a physical recount. Still recorded as an adjustment with full
              history.
            </p>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={String(row.onHand)}
              aria-label="Exact quantity on hand"
              className="mt-3 w-28 border border-line-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
            <button
              type="button"
              disabled={pending || target === ""}
              onClick={() =>
                run(() =>
                  setInventoryAction({
                    variantId: row.variantId,
                    locationId: row.locationId,
                    currentOnHand: row.onHand,
                    targetOnHand: Number(target),
                    note: "Physical recount",
                  }),
                )
              }
              className="label mt-4 block border border-line-strong px-5 py-2.5 text-ink-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:text-ink-disabled"
            >
              {pending ? "Saving…" : "Set quantity"}
            </button>
          </div>

          {message ? (
            <p
              aria-live="polite"
              className={`label lg:col-span-2 ${
                message.tone === "ok" ? "text-state-success" : "text-state-critical"
              }`}
            >
              {message.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

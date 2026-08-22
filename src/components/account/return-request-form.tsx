"use client";

import { useState, useTransition } from "react";

import { formatPrice } from "@/components/storefront/product-card";
import { requestReturnAction } from "@/lib/returns/actions";
import { RETURN_REASONS } from "@/lib/returns/types";
import type { ReturnableLine } from "@/lib/returns/types";

/**
 * Customer return request (Master Spec §9.1).
 *
 * Quantities are capped at what is actually returnable, but the server
 * re-derives that from the order's own history — a form can claim anything.
 */
export function ReturnRequestForm({
  orderNumber,
  lines,
}: {
  orderNumber: string;
  lines: ReturnableLine[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const selectable = lines.filter((l) => l.returnableQuantity > 0);
  const chosen = Object.entries(quantities).filter(([, q]) => q > 0);

  if (selectable.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-ink-muted">
        Every item on this order already has a return request.
      </p>
    );
  }

  return (
    <form
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          const result = await requestReturnAction({
            orderNumber,
            reason: String(formData.get("reason") ?? ""),
            note: String(formData.get("note") ?? "") || undefined,
            items: chosen.map(([orderItemId, quantity]) => ({
              orderItemId,
              quantity,
            })),
          });
          setMessage(
            result.ok
              ? {
                  tone: "ok",
                  text: "Return requested. We will email you once it is reviewed.",
                }
              : { tone: "error", text: result.message },
          );
        });
      }}
      className="space-y-8"
    >
      <fieldset>
        <legend className="label text-ink-subtle">What are you sending back?</legend>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {selectable.map((line) => (
            <li key={line.orderItemId} className="flex items-center justify-between gap-6 py-5">
              <div className="min-w-0">
                <p className="text-sm text-ink">{line.productTitle}</p>
                <p className="mt-1 text-xs text-ink-subtle">
                  {Object.entries(line.options)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ") || line.variantTitle}
                  {" · "}
                  {formatPrice(line.unitPriceCents, line.currency)} each
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <label htmlFor={`qty-${line.orderItemId}`} className="label text-ink-subtle">
                  Qty
                </label>
                <select
                  id={`qty-${line.orderItemId}`}
                  value={quantities[line.orderItemId] ?? 0}
                  onChange={(e) =>
                    setQuantities((q) => ({
                      ...q,
                      [line.orderItemId]: Number(e.target.value),
                    }))
                  }
                  className="border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                >
                  {Array.from({ length: line.returnableQuantity + 1 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      </fieldset>

      <div>
        <label htmlFor="reason" className="label block text-ink-subtle">
          Reason
        </label>
        <select
          id="reason"
          name="reason"
          required
          className="mt-3 w-full max-w-sm border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
        >
          {RETURN_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="note" className="label block text-ink-subtle">
          Anything else? (optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={4}
          className="mt-3 w-full max-w-lg resize-y border border-line-strong bg-transparent px-3 py-2.5 text-sm leading-relaxed text-ink focus:border-ink focus:outline-none"
        />
      </div>

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

      <button
        type="submit"
        disabled={pending || chosen.length === 0}
        className="label border border-ink/70 px-8 py-4 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
      >
        {pending ? "Sending…" : "Request return"}
      </button>
    </form>
  );
}

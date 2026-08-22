"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { StatusChip, formatDateTime } from "@/components/studio/primitives";
import { addTrackingAction } from "@/lib/fulfillment/actions";
import type { ReadyToShipRow } from "@/lib/fulfillment/types";

type Address = {
  recipient_name?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string | null;
};

/**
 * A paid, stocked order awaiting the owner's own fulfillment (Master Spec §8.1).
 *
 * V1 is deliberately manual: copy the validated address into Pirate Ship, buy
 * postage there, then record the tracking here. Nothing pretends an API exists.
 */
export function ReadyToShipCard({ row }: { row: ReadyToShipRow }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);
  const [copied, setCopied] = useState(false);

  const address = row.shippingAddress as Address;

  const addressText = [
    address.recipient_name,
    address.line1,
    address.line2,
    `${address.city ?? ""}, ${address.region ?? ""} ${address.postal_code ?? ""}`.trim(),
    address.country_code,
  ]
    .filter(Boolean)
    .join("\n");

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(addressText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({ tone: "error", text: "Could not copy. Select the address manually." });
    }
  }

  return (
    <li className="hairline bg-surface-raised">
      <header className="flex flex-col gap-3 border-b border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/studio/orders/${row.orderId}`}
            className="text-sm text-ink transition-colors hover:text-accent-strong"
          >
            {row.orderNumber}
          </Link>
          <p className="mt-1 text-xs text-ink-subtle">
            {row.customerEmail}
            {row.orderPaidAt ? ` · paid ${formatDateTime(row.orderPaidAt)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {row.locationName ? (
            <StatusChip tone="neutral">{row.locationName}</StatusChip>
          ) : null}
          <StatusChip tone="success">Paid</StatusChip>
        </div>
      </header>

      <div className="grid gap-6 px-6 py-5 lg:grid-cols-2">
        <div>
          <p className="label text-ink-subtle">Items</p>
          <ul className="mt-3 space-y-2">
            {row.items.map((item, i) => (
              <li key={i} className="text-sm text-ink-muted">
                {item.productTitle} — {item.variantTitle}
                {item.sku ? ` · ${item.sku}` : ""} × {item.quantity}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="label text-ink-subtle">Ship to</p>
            <button
              type="button"
              onClick={copyAddress}
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

      <form
        action={(formData) => {
          setMessage(null);
          startTransition(async () => {
            const result = await addTrackingAction({
              fulfillmentGroupId: row.fulfillmentGroupId,
              orderId: row.orderId,
              carrier: String(formData.get("carrier") ?? ""),
              trackingNumber: String(formData.get("trackingNumber") ?? ""),
              trackingUrl: String(formData.get("trackingUrl") ?? ""),
            });
            setMessage(
              result.ok
                ? { tone: "ok", text: "Tracking recorded. The order is now shipped." }
                : { tone: "error", text: result.message },
            );
          });
        }}
        className="border-t border-line px-6 py-5"
      >
        <p className="label text-ink-subtle">Record tracking</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          This is what marks the order shipped and notifies the customer. Do it
          after you have bought the label.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_1.4fr_auto]">
          <input
            name="carrier"
            placeholder="Carrier"
            required
            aria-label="Carrier"
            className="border border-line-strong bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
          />
          <input
            name="trackingNumber"
            placeholder="Tracking number"
            required
            aria-label="Tracking number"
            className="border border-line-strong bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
          />
          <input
            name="trackingUrl"
            placeholder="Tracking URL (optional)"
            aria-label="Tracking URL"
            className="border border-line-strong bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="label border border-ink/70 px-5 py-2 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
          >
            {pending ? "Saving…" : "Mark shipped"}
          </button>
        </div>
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
    </li>
  );
}

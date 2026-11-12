"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { StatusChip, formatDateTime } from "@/components/studio/primitives";
import type { SaveMessage } from "@/components/studio/settings-fields";
import type { OrderEmailStatus } from "@/lib/email/order-email-types";
import { sendOrderConfirmationAction } from "@/lib/studio/order-email-actions";

/**
 * The order confirmation email, as it stands for this order, and the way to
 * send it (again). The chip always carries its words; colour is never alone.
 */
export function OrderEmailPanel({
  orderId,
  status,
  paid,
}: {
  orderId: string;
  /** `undefined`: the status could not be read. `null`: never attempted. */
  status: OrderEmailStatus | undefined;
  paid: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<SaveMessage>(null);

  let chip: { tone: "success" | "warning" | "critical" | "neutral"; label: string };
  let detail: string;
  if (status === undefined) {
    chip = { tone: "warning", label: "Unknown" };
    detail = "Could not read whether the email was sent. Refresh to try again.";
  } else if (status === null) {
    chip = { tone: "neutral", label: "Not sent" };
    detail = paid
      ? "No confirmation email has gone out for this order."
      : "It goes out once the payment is confirmed.";
  } else if (status.state === "sent") {
    chip = { tone: "success", label: "Sent" };
    detail = `Sent ${formatDateTime(status.at)}.`;
  } else if (status.state === "received") {
    chip = { tone: "neutral", label: "Sending" };
    detail = "Being sent now.";
  } else if (status.state === "ignored") {
    chip = { tone: "warning", label: "Not sent" };
    detail = "Email wasn't set up when this order was paid.";
  } else {
    chip = { tone: "critical", label: "Failed" };
    detail = status.error ?? "The email could not be sent.";
  }

  const label = status?.state === "sent" ? "Send again" : "Send email";

  function send() {
    if (busy) return;
    setMessage(null);
    start(async () => {
      const result = await sendOrderConfirmationAction({ orderId });
      setMessage(result.ok ? { tone: "ok", text: "Sent." } : { tone: "error", text: result.message });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 px-6 py-5 text-sm">
      <div className="flex items-center gap-3">
        <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
      </div>
      <p className="leading-relaxed text-ink-muted">{detail}</p>
      {paid ? (
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={send}
            aria-busy={busy}
            className="label border border-ink/70 px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-inverse-ink aria-busy:opacity-60"
          >
            {busy ? "Sending…" : label}
          </button>
          {message ? (
            <span
              aria-live="polite"
              className={`label ${message.tone === "ok" ? "text-state-success" : "text-state-critical"}`}
            >
              {message.text}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

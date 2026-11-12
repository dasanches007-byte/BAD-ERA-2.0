"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  SaveRow,
  SettingsField,
  type SaveMessage,
} from "@/components/studio/settings-fields";
import {
  centsToMoneyInput,
  parseMoneyToCents,
  shippingCentsFor,
  type ShippingRule,
} from "@/lib/settings/shipping";
import { saveShippingAction } from "@/lib/studio/settings-actions";

function dollars(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

/**
 * Shipping, in the owner's words: what every order pays, and optionally the
 * order amount from which it is free. Under the fields, a sentence says what
 * a customer will be charged, worked out by the same function checkout uses.
 */
export function ShippingSettingsForm({ rule }: { rule: ShippingRule | null }) {
  const router = useRouter();
  const [flatRate, setFlatRate] = useState(rule ? centsToMoneyInput(rule.flatRateCents) : "");
  const [freeOver, setFreeOver] = useState(
    rule?.freeOverCents != null ? centsToMoneyInput(rule.freeOverCents) : "",
  );
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState<SaveMessage>(null);

  const flatCents = parseMoneyToCents(flatRate);
  const freeCents = freeOver.trim() ? parseMoneyToCents(freeOver) : null;

  let summary: string;
  if (flatCents === null) {
    summary = rule
      ? "Enter an amount like 8.00."
      : "Not set yet. Until it is, checkout cannot open, so nobody can pay.";
  } else {
    const preview: ShippingRule = { flatRateCents: flatCents, freeOverCents: freeCents };
    if (flatCents === 0) summary = "Every order ships free.";
    else if (freeCents)
      summary = `Customers pay ${dollars(shippingCentsFor(0, preview))} for shipping, or nothing on orders of ${dollars(freeCents)} or more.`;
    else summary = `Customers pay ${dollars(flatCents)} for shipping on every order.`;
  }

  function save() {
    if (busy) return;
    setMessage(null);
    startTransition(async () => {
      const result = await saveShippingAction({ flatRate, freeOver });
      if (result.ok) {
        setMessage({ tone: "ok", text: "Saved. The next checkout uses it." });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.message });
      }
    });
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <SettingsField
        id="shipping-flat"
        label="Shipping, per order"
        prefix="$"
        inputMode="decimal"
        placeholder="8.00"
        value={flatRate}
        onChange={setFlatRate}
        hint="One charge for the whole order, however many pieces. Enter 0 to always ship free."
      />
      <SettingsField
        id="shipping-free-over"
        label="Free shipping on orders over (optional)"
        prefix="$"
        inputMode="decimal"
        placeholder="Leave empty for never"
        value={freeOver}
        onChange={setFreeOver}
        hint="Orders whose pieces add up to this amount or more ship free."
      />
      <p aria-live="polite" className="border-l border-line-strong pl-4 text-sm leading-relaxed text-ink">
        {summary}
      </p>
      <SaveRow busy={busy} onSave={save} message={message} />
    </div>
  );
}

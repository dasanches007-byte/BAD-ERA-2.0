/**
 * Shipping, as the owner sets it in Studio → Settings. PURE and client-safe:
 * the settings form, the checkout summary and checkout itself all use these,
 * so the amount a customer is shown is the amount they are charged.
 *
 * v1 shipping is one flat charge per order, with an optional "free over"
 * amount (Master Spec §6.2). Neither has a default: until the owner enters the
 * flat charge, checkout refuses rather than inventing a shipping price.
 */

export type ShippingRule = {
  /** The charge for every order, in cents. 0 means shipping is always free. */
  flatRateCents: number;
  /** Orders whose subtotal reaches this ship free. Null: never free. */
  freeOverCents: number | null;
};

/** What one order pays for shipping under the owner's rule. */
export function shippingCentsFor(subtotalCents: number, rule: ShippingRule): number {
  if (rule.freeOverCents !== null && subtotalCents >= rule.freeOverCents) return 0;
  return rule.flatRateCents;
}

/** The largest amount the form accepts: a guard against a stray extra digit. */
export const MAX_SHIPPING_CENTS = 100_000;

/**
 * Read a dollar amount as typed by a person: "7", "7.5", "$7.50", " 12.00 ".
 * Returns null for anything that is not a plain non-negative amount with at
 * most two decimals. Works on the digits as text, never through floating
 * point, so "0.29" is 29 cents and not 28.999….
 */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$\s*/, "").replace(/,/g, "");
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const dollars = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  return dollars * 100 + cents;
}

/** Cents as the form shows them back: 750 -> "7.50". */
export function centsToMoneyInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

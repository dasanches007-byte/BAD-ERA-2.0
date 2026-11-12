/**
 * Reading an order's shipping address snapshot. PURE and client-safe.
 *
 * Checkout writes the snapshot in the shape of `shippingAddressSchema`:
 * `{ name, line1, line2, city, region, postalCode, country, phone }`. The
 * screens that showed it (Ready to Ship, supplier tasks, the Studio order and
 * the customer's order page) were written against a different spelling
 * (`recipient_name`, `postal_code`, `country_code`), so every real order would
 * have shown no name, no postal code and no country on the very card the
 * owner packs from. Both spellings are read here, so every screen agrees and
 * no stored snapshot has to change.
 */

export type OrderAddress = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
};

function text(source: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function readOrderAddress(snapshot: unknown): OrderAddress {
  const source =
    snapshot && typeof snapshot === "object" ? (snapshot as Record<string, unknown>) : {};
  return {
    name: text(source, "name", "recipient_name", "recipientName"),
    line1: text(source, "line1", "address_line1"),
    line2: text(source, "line2", "address_line2"),
    city: text(source, "city"),
    region: text(source, "region", "state"),
    postalCode: text(source, "postalCode", "postal_code", "zip"),
    country: text(source, "country", "country_code", "countryCode"),
    phone: text(source, "phone"),
  };
}

/** The address as lines, ready to show or to paste into a shipping label. */
export function orderAddressLines(address: OrderAddress): string[] {
  const cityLine = [
    address.city,
    [address.region, address.postalCode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return [address.name, address.line1, address.line2, cityLine, address.country].filter(Boolean);
}

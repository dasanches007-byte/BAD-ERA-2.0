import {
  EMAIL_COLORS as C,
  EMAIL_SANS as SANS,
  emailDocument,
  escapeHtml,
  eyebrow,
  heading as headingHtml,
  paragraph,
  plainText,
  row as cardRow,
  type RenderedEmail,
} from "@/lib/email/layout";
import { orderAddressLines, type OrderAddress } from "@/lib/orders/address";

export { escapeHtml, type RenderedEmail } from "@/lib/email/layout";

/**
 * The order confirmation email: what it says and how it is laid out. PURE and
 * client-safe, so Studio's preview renders exactly the email a customer gets.
 *
 * Everything shown comes from the order's own snapshot (Master Spec: never
 * render a historical order from mutable product records). The owner's words
 * come from Studio → Settings; the layout does not. Every value that reaches
 * the HTML is escaped: product titles and addresses are typed by people.
 */

export type OrderEmailLine = {
  title: string;
  variant: string;
  quantity: number;
  lineTotalCents: number;
};

export type OrderEmailData = {
  orderNumber: string;
  /** The customer's first name, when the order carries one. */
  firstName: string | null;
  currency: string;
  lines: OrderEmailLine[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingAddress: OrderAddress | null;
};

/** The owner's words. `{order}` and `{name}` are filled in per order. */
export type OrderEmailWords = {
  subject: string;
  heading: string;
  message: string;
  signOff: string;
  /** Where a customer's reply goes. Empty: replies go to the sending address. */
  replyTo: string;
};

export const ORDER_EMAIL_LIMITS = {
  subject: 120,
  heading: 120,
  message: 1200,
  signOff: 300,
} as const;

/**
 * Shipped wording. Factual only: it promises nothing the store does not do.
 * (There is no shipping-notice email yet, so it does not say "we'll email you
 * when it ships".)
 */
export const DEFAULT_ORDER_EMAIL_WORDS: OrderEmailWords = {
  subject: "Order {order} is confirmed",
  heading: "Thank you, {name}.",
  message:
    "Your order is confirmed and paid. Below is what you ordered and where it is going.",
  signOff: "",
  replyTo: "",
};

/** Fill `{order}` and `{name}`. A missing name takes its leading comma with it. */
export function fillPlaceholders(
  text: string,
  values: { order: string; name: string | null },
): string {
  const named = values.name?.trim()
    ? text.replace(/\{name\}/g, values.name.trim())
    : text.replace(/[,\s]*\{name\}/g, "");
  return named.replace(/\{order\}/g, values.order);
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function renderOrderConfirmationEmail(
  order: OrderEmailData,
  words: OrderEmailWords,
  siteUrl: string,
): RenderedEmail {
  const site = siteUrl.replace(/\/+$/, "");
  const fill = (text: string) =>
    fillPlaceholders(text, { order: order.orderNumber, name: order.firstName });

  const subject = fill(words.subject).replace(/\s+/g, " ").trim() || `Order ${order.orderNumber}`;
  const heading = fill(words.heading).trim();
  const paragraphs = fill(words.message)
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const signOff = fill(words.signOff).trim();
  const m = (cents: number) => money(cents, order.currency);

  const totals: [string, string][] = [["Subtotal", m(order.subtotalCents)]];
  if (order.discountCents > 0) totals.push(["Discount", `−${m(order.discountCents)}`]);
  totals.push(["Shipping", order.shippingCents === 0 ? "Free" : m(order.shippingCents)]);
  if (order.taxCents > 0) totals.push(["Tax", m(order.taxCents)]);

  const row = (left: string, right: string, strong = false) => `
          <tr>
            <td style="padding:6px 0;font:${strong ? "700" : "400"} 14px/1.5 ${SANS};color:${strong ? C.bone : C.steel};">${escapeHtml(left)}</td>
            <td align="right" style="padding:6px 0;font:${strong ? "700" : "400"} 14px/1.5 ${SANS};color:${C.bone};">${escapeHtml(right)}</td>
          </tr>`;

  const itemsHtml = order.lines
    .map(
      (line) => `
          <tr>
            <td style="padding:14px 0;border-top:1px solid ${C.line};">
              <div style="font:600 15px/1.4 ${SANS};color:${C.bone};">${escapeHtml(line.title)}</div>
              <div style="margin-top:2px;font:400 13px/1.5 ${SANS};color:${C.steel};">${escapeHtml(
                [line.variant, `Qty ${line.quantity}`].filter(Boolean).join(" · "),
              )}</div>
            </td>
            <td align="right" valign="top" style="padding:14px 0;border-top:1px solid ${C.line};font:400 14px/1.4 ${SANS};color:${C.bone};white-space:nowrap;">${escapeHtml(m(line.lineTotalCents))}</td>
          </tr>`,
    )
    .join("");

  const addressHtml = order.shippingAddress
    ? cardRow(
        `${eyebrow("Shipping to")}<div style="margin-top:10px;font:400 14px/1.6 ${SANS};color:${C.bone};">${orderAddressLines(
          order.shippingAddress,
        )
          .map(escapeHtml)
          .join("<br>")}</div>`,
      )
    : "";

  const html = emailDocument({
    site,
    title: subject,
    preheader: `Order ${order.orderNumber} · ${m(order.totalCents)}`,
    rows: [
      cardRow(
        `${eyebrow(`Order ${order.orderNumber}`)}${heading ? headingHtml(heading) : ""}${paragraphs
          .map(paragraph)
          .join("")}`,
      ),
      cardRow(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemsHtml}
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line};margin-top:2px;padding-top:8px;">${totals
          .map(([l, r]) => row(l, r))
          .join("")}${row("Total", m(order.totalCents), true)}
        </table>`),
      addressHtml,
      signOff
        ? cardRow(
            `<div style="font:400 15px/1.6 ${SANS};color:${C.bone};">${escapeHtml(signOff).replace(/\n/g, "<br>")}</div>`,
          )
        : "",
    ].join(""),
    footer: `Questions about your order? <a href="${escapeHtml(site)}/support" style="color:${C.bone};">Contact us</a> and mention order ${escapeHtml(order.orderNumber)}.`,
  });

  const text: string[] = [
    `Order ${order.orderNumber}`,
    heading,
    ...paragraphs,
    "",
    ...order.lines.map(
      (line) =>
        `${line.title}${line.variant ? ` (${line.variant})` : ""} × ${line.quantity}  ${m(line.lineTotalCents)}`,
    ),
    "",
    ...totals.map(([l, r]) => `${l}: ${r}`),
    `Total: ${m(order.totalCents)}`,
    ...(order.shippingAddress ? ["", "Shipping to:", ...orderAddressLines(order.shippingAddress)] : []),
    ...(signOff ? ["", signOff] : []),
    "",
    `Questions? ${site}/support (mention order ${order.orderNumber})`,
  ];

  return { subject, html, text: plainText(text) };
}

/**
 * An example order for Studio's preview. Shown only to the owner, labelled as
 * an example, and never sent.
 */
export const EXAMPLE_ORDER: OrderEmailData = {
  orderNumber: "BE-1001",
  firstName: "Jordan",
  currency: "USD",
  lines: [
    { title: "Example tee", variant: "Black / M", quantity: 1, lineTotalCents: 3000 },
    { title: "Example bag", variant: "Black", quantity: 1, lineTotalCents: 2500 },
  ],
  subtotalCents: 5500,
  discountCents: 0,
  shippingCents: 800,
  taxCents: 0,
  totalCents: 6300,
  shippingAddress: {
    name: "Jordan Example",
    line1: "123 Example Street",
    line2: "",
    city: "Los Angeles",
    region: "CA",
    postalCode: "90001",
    country: "US",
    phone: "",
  },
};

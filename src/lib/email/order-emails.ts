import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import { serverEnv } from "@/lib/env/server";
import { renderOrderConfirmationEmail, type OrderEmailData } from "@/lib/email/order-confirmation";
import type { OrderEmailState, OrderEmailStatus } from "@/lib/email/order-email-types";
import { sendEmail } from "@/lib/email/resend";
import { log } from "@/lib/observability/logger";
import { readOrderAddress } from "@/lib/orders/address";
import { readOrderEmailWords } from "@/lib/settings/store";

/**
 * The order confirmation email: sent once per paid order, after the verified
 * Stripe webhook has converted the checkout (never by the success page, and
 * never inside the transaction that records payment).
 *
 * Each order's email has ONE `integration_events` row, keyed
 * `order-confirmation:<order id>`. The automatic send inserts it before
 * calling Resend; the unique index means a webhook replay finds the row and
 * stops, so a customer is never emailed twice for one order. The row then
 * records what happened, which is what Studio's order page shows:
 *
 *   received  being sent now
 *   sent      Resend accepted it
 *   failed    Resend refused or could not be reached (the reason is kept)
 *   ignored   email was not set up when the order was paid
 *
 * The owner can send it again from the order page (`mode: "manual"`), for a
 * customer who says it never arrived or after email has been set up.
 *
 * Nothing here can touch the order: an email failure is recorded and logged,
 * never thrown into the payment path.
 */

const INTEGRATION = "resend";
const EVENT_TYPE = "email.order_confirmation";

const keyFor = (orderId: string) => `order-confirmation:${orderId}`;

export type { OrderEmailState, OrderEmailStatus } from "@/lib/email/order-email-types";

async function loadOrder(
  orderId: string,
): Promise<{ email: string; data: OrderEmailData } | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("orders")
    .select(
      "order_number, customer_email, currency, subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents, customer_snapshot, shipping_address_snapshot, paid_at, order_items(product_title_snapshot, variant_title_snapshot, quantity, line_total_cents, created_at)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.paid_at) return null;

  const snapshot = (data.customer_snapshot ?? {}) as { name?: unknown };
  const address = readOrderAddress(data.shipping_address_snapshot);
  const fullName =
    typeof snapshot.name === "string" && snapshot.name.trim() ? snapshot.name : address.name;

  const items = [...(data.order_items ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  return {
    email: data.customer_email,
    data: {
      orderNumber: data.order_number,
      firstName: fullName.trim().split(/\s+/)[0] || null,
      currency: data.currency,
      lines: items.map((item) => ({
        title: item.product_title_snapshot,
        variant: item.variant_title_snapshot === "Default" ? "" : item.variant_title_snapshot,
        quantity: item.quantity,
        lineTotalCents: Number(item.line_total_cents),
      })),
      subtotalCents: Number(data.subtotal_cents),
      discountCents: Number(data.discount_cents),
      shippingCents: Number(data.shipping_cents),
      taxCents: Number(data.tax_cents),
      totalCents: Number(data.total_cents),
      shippingAddress: address.line1 ? address : null,
    },
  };
}

/**
 * Take this order's email for sending. Automatic: only if it has never been
 * attempted. Manual: unless a send is in flight right now (one stuck for ten
 * minutes counts as dead).
 */
async function claim(orderId: string, mode: "auto" | "manual"): Promise<boolean> {
  const db = createAdminClient();
  const { error } = await db.from("integration_events").insert({
    integration_key: INTEGRATION,
    external_event_id: keyFor(orderId),
    event_type: EVENT_TYPE,
    direction: "outbound",
    status: "received",
    reference_type: "order",
    reference_id: orderId,
  });
  if (!error) return true;
  if (error.code !== "23505") throw error;
  if (mode === "auto") return false;

  const { data, error: updateError } = await db
    .from("integration_events")
    .update({ status: "received", error_message: null, processed_at: null, created_at: new Date().toISOString() })
    .eq("integration_key", INTEGRATION)
    .eq("external_event_id", keyFor(orderId))
    // Not while a send is in flight, unless that send has sat for ten minutes:
    // then the process that held it died, and the owner must be able to retry.
    .or(`status.neq.received,created_at.lt.${new Date(Date.now() - 10 * 60_000).toISOString()}`)
    .select("id");
  if (updateError) throw updateError;
  return (data ?? []).length === 1;
}

async function record(orderId: string, state: Exclude<OrderEmailState, "received">, message: string | null) {
  const db = createAdminClient();
  const { error } = await db
    .from("integration_events")
    .update({ status: state, error_message: message, processed_at: new Date().toISOString() })
    .eq("integration_key", INTEGRATION)
    .eq("external_event_id", keyFor(orderId));
  if (error) log.error("email.order_confirmation.record_failed", { orderId, error });
}

export type SendOrderEmailResult =
  | { ok: true }
  | { ok: false; reason: "already_sent" | "in_flight" | "not_paid" | "not_configured" | "failed"; message: string };

export async function sendOrderConfirmation(
  orderId: string,
  mode: "auto" | "manual" = "auto",
): Promise<SendOrderEmailResult> {
  if (!(await claim(orderId, mode))) {
    return mode === "auto"
      ? { ok: false, reason: "already_sent", message: "This order's email was already handled." }
      : { ok: false, reason: "in_flight", message: "The email is being sent right now." };
  }

  try {
    const order = await loadOrder(orderId);
    if (!order) {
      await record(orderId, "failed", "The order is not paid, so no confirmation was sent.");
      return { ok: false, reason: "not_paid", message: "This order is not paid yet." };
    }

    const words = await readOrderEmailWords();
    const email = renderOrderConfirmationEmail(order.data, words, serverEnv().NEXT_PUBLIC_SITE_URL);
    const result = await sendEmail({
      to: order.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: words.replyTo || null,
      // Automatic sends share one key, so a replay inside Resend's window is
      // the same email. A deliberate re-send from Studio gets its own.
      idempotencyKey:
        mode === "auto"
          ? `order-confirmation/${orderId}`
          : `order-confirmation/${orderId}/${Date.now()}`,
    });

    if (result.ok) {
      await record(orderId, "sent", null);
      log.info("email.order_confirmation.sent", { orderId, mode });
      return { ok: true };
    }

    await record(orderId, result.notConfigured ? "ignored" : "failed", result.message);
    log.warn("email.order_confirmation.not_sent", { orderId, mode, reason: result.message });
    return {
      ok: false,
      reason: result.notConfigured ? "not_configured" : "failed",
      message: result.message,
    };
  } catch (error) {
    await record(orderId, "failed", "Something went wrong while sending.");
    log.error("email.order_confirmation.error", { orderId, error });
    return { ok: false, reason: "failed", message: "Something went wrong while sending." };
  }
}

/** What happened to an order's confirmation email, for Studio. */
export async function getOrderEmailStatus(orderId: string): Promise<OrderEmailStatus> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("integration_events")
    .select("status, created_at, processed_at, error_message")
    .eq("integration_key", INTEGRATION)
    .eq("external_event_id", keyFor(orderId))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    state: data.status as OrderEmailState,
    at: data.processed_at ?? data.created_at,
    error: data.error_message,
  };
}

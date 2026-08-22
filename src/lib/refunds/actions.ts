"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStudioOwner, StudioAuthorizationError } from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";
import type { Json } from "@/lib/db/generated.types";
import { getStripe } from "@/lib/payments/stripe/client";

/**
 * Refunds (Master Spec §9.1, §10.3.7).
 *
 * Deliberately its own module, separate from returns and from inventory:
 *
 *   - Refunding does NOT restock. Putting a unit back on the shelf is an
 *     explicit decision made after inspecting what came back.
 *   - Approving a return does NOT refund. Money moves only here.
 *
 * The refund is executed through Stripe SERVER-SIDE, and the local record only
 * becomes `succeeded` once Stripe confirms it. A refund row that says
 * "succeeded" before Stripe agrees would be a lie about money.
 */

export type RefundResult =
  | { ok: true; refundId: string; amountCents: number }
  | { ok: false; message: string };

const refundSchema = z.object({
  orderId: z.uuid(),
  amountCents: z.number().int().positive("Enter an amount greater than zero"),
  reason: z.string().max(500).optional(),
  returnId: z.uuid().optional(),
});

export async function refundOrderAction(input: unknown): Promise<RefundResult> {
  let actorUserId: string;
  try {
    const identity = await requireStudioOwner();
    actorUserId = identity.userId;
  } catch (error) {
    if (error instanceof StudioAuthorizationError) {
      return { ok: false, message: "Studio authorization required." };
    }
    throw error;
  }

  const parsed = refundSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid refund" };
  }

  const { orderId, amountCents, reason } = parsed.data;
  const db = createAdminClient();

  const { data: order, error: orderError } = await db
    .from("orders")
    .select(
      `id, order_number, currency, total_cents, payment_status,
       stripe_payment_intent_id,
       payments(id, external_payment_intent_id, amount_captured_cents),
       refunds(amount_cents, status)`,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) return { ok: false, message: orderError.message };
  if (!order) return { ok: false, message: "That order could not be found." };

  if (order.payment_status !== "paid" && order.payment_status !== "partially_refunded") {
    return {
      ok: false,
      message: `This order is ${order.payment_status.replace(/_/g, " ")}. Only a paid order can be refunded.`,
    };
  }

  const payments = (order.payments ?? []) as {
    id: string;
    external_payment_intent_id: string | null;
    amount_captured_cents: number;
  }[];
  const existingRefunds = (order.refunds ?? []) as {
    amount_cents: number;
    status: string;
  }[];

  // Pending refunds count against the limit too. Ignoring them would allow two
  // concurrent refunds to together exceed what was captured.
  const alreadyRefunded = existingRefunds
    .filter((r) => r.status === "succeeded" || r.status === "pending")
    .reduce((sum, r) => sum + Number(r.amount_cents), 0);

  const captured = payments.reduce(
    (sum, p) => sum + Number(p.amount_captured_cents),
    0,
  );
  const refundable = Math.max(captured - alreadyRefunded, 0);

  if (amountCents > refundable) {
    return {
      ok: false,
      message: `Only ${(refundable / 100).toFixed(2)} ${order.currency} remains refundable on this order.`,
    };
  }

  const paymentIntentId =
    order.stripe_payment_intent_id ??
    payments.find((p) => p.external_payment_intent_id)?.external_payment_intent_id ??
    null;

  if (!paymentIntentId) {
    return {
      ok: false,
      message: "No Stripe payment is recorded against this order, so it cannot be refunded through Stripe.",
    };
  }

  const payment = payments.find((p) => p.external_payment_intent_id === paymentIntentId);

  // Record the intent to refund BEFORE calling Stripe, so a crash mid-call
  // leaves a pending row to reconcile rather than an invisible refund.
  const { data: local, error: localError } = await db
    .from("refunds")
    .insert({
      order_id: orderId,
      payment_id: payment?.id ?? null,
      status: "pending",
      amount_cents: amountCents,
      currency: order.currency,
      reason: reason?.trim() || null,
      initiated_by: actorUserId,
    })
    .select("id")
    .single();

  if (localError) return { ok: false, message: localError.message };

  try {
    const stripe = getStripe();
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: amountCents,
        metadata: {
          bad_era_order: order.order_number,
          bad_era_refund: local.id,
        },
      },
      // Stripe-side idempotency: a retried call with the same key returns the
      // original refund instead of creating a second one.
      { idempotencyKey: `bad-era-refund-${local.id}` },
    );

    // Stripe has confirmed. Only now is the local record truthful.
    await db
      .from("refunds")
      .update({
        stripe_refund_id: refund.id,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
        succeeded_at: refund.status === "succeeded" ? new Date().toISOString() : null,
      })
      .eq("id", local.id);

    await recomputeRefundStatus(orderId);

    await db.from("audit_events").insert({
      action: "order.refunded",
      entity_type: "order",
      entity_id: orderId,
      actor_user_id: actorUserId,
      metadata: {
        refund_id: local.id,
        stripe_refund_id: refund.id,
        amount_cents: amountCents,
        reason: reason ?? null,
      } as Json,
    });

    revalidatePath(`/studio/orders/${orderId}`);
    revalidatePath("/studio/returns");

    return { ok: true, refundId: local.id, amountCents };
  } catch (error) {
    // The refund did not happen. Mark it failed rather than leaving a pending
    // row that looks like money in flight.
    await db
      .from("refunds")
      .update({ status: "failed", failed_at: new Date().toISOString() })
      .eq("id", local.id);

    console.error("[bad-era] stripe refund failed", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Stripe refused the refund: ${error.message}`
          : "Stripe refused the refund.",
    };
  }
}

/**
 * Derive the order's refund status from its succeeded refunds.
 *
 * Derived rather than set by hand, so partial and full can never disagree with
 * the actual amounts.
 */
async function recomputeRefundStatus(orderId: string): Promise<void> {
  const db = createAdminClient();

  const { data: order } = await db
    .from("orders")
    .select("total_cents, refunds(amount_cents, status)")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return;

  const refunds = (order.refunds ?? []) as { amount_cents: number; status: string }[];
  const succeeded = refunds
    .filter((r) => r.status === "succeeded")
    .reduce((sum, r) => sum + Number(r.amount_cents), 0);

  const total = Number(order.total_cents);
  const refundStatus =
    succeeded <= 0 ? "none" : succeeded >= total ? "full" : "partial";

  // payment_status carries the money story; fulfillment and return statuses
  // are untouched here (Master Spec §7.1).
  const paymentStatus =
    succeeded <= 0 ? "paid" : succeeded >= total ? "refunded" : "partially_refunded";

  await db
    .from("orders")
    .update({ refund_status: refundStatus, payment_status: paymentStatus })
    .eq("id", orderId);
}

import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/db/admin";
import type { CommerceRpc } from "@/lib/checkout/stripe-event-handler";

/**
 * Commerce RPC boundary.
 *
 * Every function here calls a narrow SECURITY DEFINER PostgreSQL routine that
 * owns its own transaction, row locks and idempotency. The TypeScript layer
 * adds nothing to those guarantees — it must not "help" by pre-checking state,
 * retrying, or splitting an operation into several calls. Atomicity lives in
 * the database (Kickoff v0.2 §4).
 *
 * These RPCs are executable only by `service_role`, so they always run through
 * the server-only admin client. Never expose any of them to browser code.
 *
 * Results are parsed strictly: an unexpected shape is a bug worth failing on,
 * not something to coerce.
 */

const reserveResultSchema = z.object({
  status: z.enum(["reserved", "already_reserved"]),
  checkout_session_id: z.uuid(),
});

const releaseResultSchema = z.object({
  status: z.literal("released"),
  checkout_session_id: z.uuid(),
});

/** Checkout states from which inventory may be released. */
export type ReleaseReason = "expired" | "payment_failed" | "cancelled";

export class CommerceRpcError extends Error {
  constructor(
    readonly rpc: string,
    readonly cause: unknown,
  ) {
    super(
      `commerce RPC ${rpc} failed: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = "CommerceRpcError";
  }
}

function fail(rpc: string, cause: unknown): never {
  throw new CommerceRpcError(rpc, cause);
}

export const commerceRpc: CommerceRpc = {
  /**
   * Claim a Stripe event for processing.
   *
   * Returns false when the event id was already recorded, which is how
   * duplicate and concurrent webhook deliveries become no-ops. The caller must
   * stop when this returns false (acceptance case 7).
   */
  async claimStripeEvent(eventId, eventType, payloadHash) {
    const db = createAdminClient();
    const { data, error } = await db.rpc("claim_stripe_event", {
      p_stripe_event_id: eventId,
      p_event_type: eventType,
      p_payload_hash: payloadHash ?? null,
    });

    if (error) fail("claim_stripe_event", error);
    return z.boolean().parse(data);
  },

  async finishStripeEvent(eventId, status, errorMessage) {
    const db = createAdminClient();
    const { error } = await db.rpc("finish_stripe_event", {
      p_stripe_event_id: eventId,
      p_processing_status: status,
      // Store a bounded summary. Full provider payloads stay out of this column.
      p_error_message: errorMessage ? errorMessage.slice(0, 2000) : null,
    });

    if (error) fail("finish_stripe_event", error);
  },

  /**
   * Resolve the durable checkout snapshot behind a Stripe Checkout Session.
   *
   * Returns null when no snapshot matches, which the event handler treats as a
   * hard error — a verified Stripe session that BAD ERA cannot place must never
   * be silently ignored.
   */
  async checkoutIdFromStripeSession(stripeSessionId) {
    const db = createAdminClient();
    const { data, error } = await db
      .from("checkout_sessions")
      .select("id")
      .eq("stripe_checkout_session_id", stripeSessionId)
      .maybeSingle();

    if (error) fail("checkoutIdFromStripeSession", error);
    return data?.id ?? null;
  },

  /**
   * Convert a paid checkout into exactly one BAD ERA order.
   *
   * One transaction creates the order, snapshots items and components,
   * converts reserved inventory to a sale, records the payment and builds
   * fulfillment groups. Replaying the same paid event returns the same order id
   * rather than creating a second order.
   */
  async convertPaidCheckout(checkoutId, stripeSessionId, paymentIntentId) {
    const db = createAdminClient();
    const { data, error } = await db.rpc("convert_paid_checkout", {
      p_checkout_session_id: checkoutId,
      p_stripe_checkout_session_id: stripeSessionId,
      p_stripe_payment_intent_id: paymentIntentId,
    });

    if (error) fail("convert_paid_checkout", error);
    return z.uuid().parse(data);
  },

  /**
   * Hold a reservation while a delayed payment method settles.
   *
   * Stock stays reserved. Releasing here would let someone else buy the unit
   * out from under a customer whose payment is still in flight
   * (acceptance case 4).
   */
  async markCheckoutPaymentPending(checkoutId) {
    const db = createAdminClient();
    const { error } = await db.rpc("mark_checkout_payment_pending", {
      p_checkout_session_id: checkoutId,
    });

    if (error) fail("mark_checkout_payment_pending", error);
  },

  /** Release a reservation exactly once on expiry, failure or cancellation. */
  async releaseCheckoutInventory(checkoutId, status) {
    const db = createAdminClient();
    const { data, error } = await db.rpc("release_checkout_inventory", {
      p_checkout_session_id: checkoutId,
      p_checkout_status: status,
    });

    if (error) fail("release_checkout_inventory", error);
    releaseResultSchema.parse(data);
  },
};

/**
 * Reserve internal stock for a durable checkout snapshot.
 *
 * Not part of the Stripe event contract — checkout creation calls this before
 * redirecting to Stripe. Repeating it for the same checkout is a no-op that
 * reports `already_reserved` rather than reserving twice (acceptance case 2).
 *
 * Only components in `stocked` mode participate; supplier-stocked, made-to-order
 * and manual lines never touch BAD ERA inventory levels.
 */
export async function reserveCheckoutInventory(
  checkoutId: string,
): Promise<z.infer<typeof reserveResultSchema>> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("reserve_checkout_inventory", {
    p_checkout_session_id: checkoutId,
  });

  if (error) fail("reserve_checkout_inventory", error);
  return reserveResultSchema.parse(data);
}

/**
 * Recovery sweep for checkouts abandoned before payment.
 *
 * Safe to run on a schedule; it only touches reservations whose expiry has
 * passed. Returns the number of checkouts released.
 */
export async function releaseExpiredCheckoutInventory(): Promise<number> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("release_expired_checkout_inventory");

  if (error) fail("release_expired_checkout_inventory", error);
  return z.number().int().parse(data);
}

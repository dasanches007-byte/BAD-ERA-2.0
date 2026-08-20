import { notImplemented, toErrorResponse } from "@/lib/errors/http";

export const runtime = "nodejs";

/**
 * Create a Stripe Checkout Session.
 *
 * Phase 1 contract: validate the cart server-side, write a durable checkout
 * snapshot (checkout_sessions + checkout_lines + checkout_line_components),
 * call reserve_checkout_inventory(), and only then create the Stripe session.
 * Client-supplied prices are never trusted (Kickoff v0.2 §3).
 */
export async function POST() {
  try {
    return notImplemented("Phase 1");
  } catch (error) {
    return toErrorResponse(error);
  }
}

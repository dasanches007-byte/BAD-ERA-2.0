import { NextResponse } from "next/server";

import { createCheckout, CheckoutError } from "@/lib/checkout/create-checkout";
import { MissingSettingError } from "@/lib/settings/store";
import { CartError } from "@/lib/cart/service";
import { resolveExistingCartId } from "@/lib/cart/session";
import { toErrorResponse } from "@/lib/errors/http";
import { log, requestId } from "@/lib/observability/logger";
import {
  RATE_LIMITS,
  checkAnonymousRateLimit,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

/**
 * Create a Stripe Checkout Session for a validated cart.
 *
 * The full invariant runs inside `createCheckout`: server-side cart validation,
 * a durable snapshot, an atomic inventory reservation, then the Stripe session.
 * Client-supplied prices are never read (Kickoff v0.2 §3).
 */
export async function POST(request: Request) {
  const rid = requestId(request.headers);

  try {
    /**
     * Rate limit before doing any work (Master Spec §17).
     *
     * Each checkout writes a durable snapshot and takes an inventory
     * RESERVATION, so an unmetered loop here does not just burn CPU — it holds
     * real stock out of the catalogue until the reservations expire. That is
     * what makes this a sensitive mutation rather than an ordinary read.
     */
    const limit = await checkAnonymousRateLimit(RATE_LIMITS.checkout);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "rate_limited", message: limit.message },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    /**
     * The cart id comes from the SESSION COOKIE, never from the request body.
     *
     * The browser knows its own cart through an httpOnly token; it has no
     * legitimate reason to name a cart id, and accepting one would let a caller
     * check out a cart that is not theirs — reserving someone else's stock and
     * snapshotting their basket against a shipping address of the caller's
     * choosing. Anything the client sends under `cartId` is discarded here.
     */
    const cartId = await resolveExistingCartId();
    if (!cartId) {
      return NextResponse.json(
        { error: "cart_not_found", message: "Your cart has expired." },
        { status: 404 },
      );
    }

    const { email, shippingAddress } = (body ?? {}) as {
      email?: unknown;
      shippingAddress?: unknown;
    };

    const result = await createCheckout({
      cartId,
      email,
      shippingAddress,
    } as Parameters<typeof createCheckout>[0]);

    return NextResponse.json({
      checkoutSessionId: result.checkoutSessionId,
      redirectUrl: result.redirectUrl,
    });
  } catch (error) {
    // Expected, actionable failures carry a safe customer-facing message.
    if (error instanceof CheckoutError || error instanceof CartError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }

    if (error instanceof MissingSettingError) {
      // A store misconfiguration, not a customer mistake. Log it loudly and
      // keep the customer-facing text generic.
      log.error("checkout.blocked.missing_setting", { rid, key: error.key });
      return NextResponse.json(
        {
          error: "store_not_configured",
          message: "Checkout is temporarily unavailable. Please try again shortly.",
        },
        { status: 503 },
      );
    }

    return toErrorResponse(error);
  }
}

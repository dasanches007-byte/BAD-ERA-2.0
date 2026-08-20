import { NextResponse } from "next/server";

import { createCheckout, CheckoutError } from "@/lib/checkout/create-checkout";
import { MissingSettingError } from "@/lib/settings/store";
import { CartError } from "@/lib/cart/service";
import { toErrorResponse } from "@/lib/errors/http";

export const runtime = "nodejs";

/**
 * Create a Stripe Checkout Session for a validated cart.
 *
 * The full invariant runs inside `createCheckout`: server-side cart validation,
 * a durable snapshot, an atomic inventory reservation, then the Stripe session.
 * Client-supplied prices are never read (Kickoff v0.2 §3).
 */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const result = await createCheckout(
      body as Parameters<typeof createCheckout>[0],
    );

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
      console.error("[bad-era] checkout blocked by missing setting", error.key);
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

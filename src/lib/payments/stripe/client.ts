import "server-only";

import Stripe from "stripe";

import { stripeEnv } from "@/lib/env/server";

/**
 * Lazily-constructed Stripe client.
 *
 * Constructing Stripe at module scope breaks `next build`: page-data collection
 * evaluates route modules, and the Stripe constructor throws when no API key is
 * present. Builds must not require production secrets — CI, a fresh clone and a
 * preview deploy all legitimately lack them.
 *
 * Deferring construction to the first request keeps the secret server-side,
 * keeps the build hermetic, and still fails loudly the moment a real webhook
 * arrives without configuration.
 */
let cached: Stripe | undefined;

export function getStripe(): Stripe {
  if (!cached) {
    cached = new Stripe(stripeEnv().STRIPE_SECRET_KEY);
  }
  return cached;
}

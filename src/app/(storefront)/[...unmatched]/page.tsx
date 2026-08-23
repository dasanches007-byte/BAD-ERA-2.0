import { notFound } from "next/navigation";

/**
 * Catch-all for unmatched storefront paths.
 *
 * Without this, an unknown URL falls through to Next's built-in `/_not-found`,
 * which is ALWAYS prerendered and therefore cannot carry a per-request CSP
 * nonce — measured at 10 script tags, 0 nonced, so the 404 page served
 * unhydrated under the Phase 9 policy.
 *
 * Rendering the miss through a dynamic route instead means `notFound()`
 * resolves the storefront's own `not-found.tsx` inside a dynamic render, so it
 * gets a nonce like every other page. Next matches concrete and parameterised
 * routes before a catch-all, so this shadows nothing.
 */
export const dynamic = "force-dynamic";

export default function UnmatchedStorefrontPath(): never {
  notFound();
}

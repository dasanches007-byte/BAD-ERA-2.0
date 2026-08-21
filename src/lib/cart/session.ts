import "server-only";

import { cookies } from "next/headers";

import { getOrCreateCart } from "@/lib/cart/service";

/**
 * Cart session identity.
 *
 * Anonymous carts are supported and are keyed by an opaque token in an
 * httpOnly cookie. The cookie holds a random token, never a cart id and never
 * anything the client could use to reach another customer's cart
 * (Master Spec §6.1).
 */

const COOKIE = "bad_era_cart";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Read the current cart token without creating one. */
export async function readCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

/**
 * Resolve the caller's cart, creating one on first use.
 *
 * Must be called from a Server Action or Route Handler — Server Components
 * cannot set cookies.
 */
export async function resolveCart(
  customerId?: string | null,
): Promise<{ id: string; token: string }> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  const token = existing ?? crypto.randomUUID();

  const cart = await getOrCreateCart(token, customerId);

  if (!existing) {
    store.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
  }

  return { id: cart.id, token };
}

/**
 * Resolve an existing cart for a read-only render, or null.
 *
 * Never creates a cart, so a Server Component can call it safely.
 */
export async function resolveExistingCartId(): Promise<string | null> {
  const token = await readCartToken();
  if (!token) return null;

  const cart = await getOrCreateCart(token);
  return cart.id;
}

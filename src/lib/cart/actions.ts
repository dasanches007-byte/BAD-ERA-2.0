"use server";

import { revalidatePath } from "next/cache";

import { getBagView, readBagForRender } from "@/lib/cart/bag";
import type { BagView } from "@/lib/cart/bag-types";
import { addItem, removeItem, updateItemQuantity, CartError } from "@/lib/cart/service";
import { resolveCart } from "@/lib/cart/session";

/**
 * Cart mutations.
 *
 * Server Actions so the browser never touches the database directly. Each one
 * validates server-side and returns a safe result; a hidden or disabled button
 * is never the authorization or validation boundary (Master Spec §16.1).
 *
 * A successful change returns the bag as it now stands — re-read on the
 * server, prices and all — so the slide-in bag and the header's count show
 * the truth without the browser working anything out.
 */

export type CartActionResult =
  // `bag` is null only when the change was made but the bag could not be
  // read back; the browser then asks again (`loadBagAction`).
  | { ok: true; bag: BagView | null }
  | { ok: false; code: string; message: string };

/** The bag after a change that has already succeeded. Never fails the change. */
async function bagAfter(cartId: string): Promise<BagView | null> {
  try {
    return await getBagView(cartId);
  } catch (error) {
    console.error("[bad-era] bag re-read failed after a cart change", error);
    return null;
  }
}

function toResult(error: unknown): CartActionResult {
  if (error instanceof CartError) {
    return { ok: false, code: error.code, message: error.message };
  }
  console.error("[bad-era] cart action failed", error);
  return {
    ok: false,
    code: "cart_error",
    message: "Something went wrong updating your cart.",
  };
}

export async function addToCartAction(
  variantId: string,
  quantity = 1,
): Promise<CartActionResult> {
  try {
    const cart = await resolveCart();
    await addItem(cart.id, variantId, quantity);
    revalidatePath("/cart");
    return { ok: true, bag: await bagAfter(cart.id) };
  } catch (error) {
    return toResult(error);
  }
}

export async function updateCartLineAction(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  try {
    const cart = await resolveCart();
    await updateItemQuantity(cart.id, itemId, quantity);
    revalidatePath("/cart");
    return { ok: true, bag: await bagAfter(cart.id) };
  } catch (error) {
    return toResult(error);
  }
}

export async function removeCartLineAction(
  itemId: string,
): Promise<CartActionResult> {
  try {
    const cart = await resolveCart();
    await removeItem(cart.id, itemId);
    revalidatePath("/cart");
    return { ok: true, bag: await bagAfter(cart.id) };
  } catch (error) {
    return toResult(error);
  }
}

/**
 * The visitor's own bag, re-read. A read: it creates nothing, and it reaches
 * only the cart named by the caller's own httpOnly cookie.
 */
export async function loadBagAction(): Promise<BagView> {
  return readBagForRender();
}

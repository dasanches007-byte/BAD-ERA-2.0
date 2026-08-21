"use server";

import { revalidatePath } from "next/cache";

import { addItem, removeItem, updateItemQuantity, CartError } from "@/lib/cart/service";
import { resolveCart } from "@/lib/cart/session";

/**
 * Cart mutations.
 *
 * Server Actions so the browser never touches the database directly. Each one
 * validates server-side and returns a safe result; a hidden or disabled button
 * is never the authorization or validation boundary (Master Spec §16.1).
 */

export type CartActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

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
    return { ok: true };
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
    return { ok: true };
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
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/db/admin";
import { getStockThresholds } from "@/lib/settings/store";
import {
  clampToSellable,
  stockState,
  type StockState,
} from "@/lib/inventory/availability";
import { resolveSellableQuantities } from "@/lib/catalog/availability-lookup";

/**
 * Cart domain service.
 *
 * `cart_items` stores only `variant_id` and `quantity`. Prices are ALWAYS
 * derived server-side from the current variant record — the client never
 * supplies a price, and a cart never records one (Master Spec §6.1: "never
 * trust client price").
 *
 * Adding to a cart does NOT reserve or decrement inventory. Stock is only
 * committed at checkout snapshot time (Master Spec §14.2).
 */

export const MAX_LINE_QUANTITY = 20;

export class CartError extends Error {
  readonly status = 400;
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "CartError";
  }
}

export type CartLine = {
  itemId: string;
  variantId: string;
  productId: string;
  productHandle: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  options: Record<string, string>;
  isBundle: boolean;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  currency: string;
  /** Null means unbounded. */
  sellableQuantity: number | null;
  stockState: StockState;
  /** True when the line can no longer be fulfilled at its current quantity. */
  needsAttention: boolean;
};

export type Cart = {
  id: string;
  sessionToken: string;
  customerId: string | null;
  currency: string;
  lines: CartLine[];
  subtotalCents: number;
  /** True when any line is unpurchasable or over-committed. */
  hasBlockingIssues: boolean;
};

const quantitySchema = z.number().int().min(1).max(MAX_LINE_QUANTITY);

/**
 * Find an active cart by session token, creating one when absent.
 *
 * Anonymous carts are supported; `customerId` is attached on sign-in.
 */
export async function getOrCreateCart(
  sessionToken: string,
  customerId?: string | null,
): Promise<{ id: string; sessionToken: string }> {
  const db = createAdminClient();

  const { data: existing, error } = await db
    .from("carts")
    .select("id, session_token")
    .eq("session_token", sessionToken)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (existing) {
    return { id: existing.id, sessionToken: existing.session_token };
  }

  const { data: created, error: createError } = await db
    .from("carts")
    .insert({
      session_token: sessionToken,
      customer_id: customerId ?? null,
      status: "active",
    })
    .select("id, session_token")
    .single();

  if (createError) throw createError;
  return { id: created.id, sessionToken: created.session_token };
}

/**
 * Add a variant to the cart, or increase an existing line.
 *
 * Validates that the variant is active, its product is active, and the
 * requested quantity is currently sellable. Availability is re-checked at
 * checkout and again atomically in the database at reservation time; this is a
 * fast rejection, never the authority.
 */
export async function addItem(
  cartId: string,
  variantId: string,
  quantity = 1,
): Promise<void> {
  const parsedQuantity = quantitySchema.safeParse(quantity);
  if (!parsedQuantity.success) {
    throw new CartError(
      `Quantity must be between 1 and ${MAX_LINE_QUANTITY}.`,
      "invalid_quantity",
    );
  }

  const db = createAdminClient();

  const { data: variant, error } = await db
    .from("product_variants")
    .select("id, active, product_id, products(status)")
    .eq("id", variantId)
    .maybeSingle();

  if (error) throw error;
  if (!variant || !variant.active) {
    throw new CartError("That item is no longer available.", "variant_inactive");
  }

  const productStatus = (variant as { products?: { status?: string } | null })
    .products?.status;
  if (productStatus !== "active") {
    throw new CartError("That item is no longer available.", "product_inactive");
  }

  const { data: existing, error: existingError } = await db
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", variantId)
    .maybeSingle();
  if (existingError) throw existingError;

  const desired = (existing?.quantity ?? 0) + parsedQuantity.data;

  const availability = await resolveSellableQuantities([variantId]);
  const sellable = availability.get(variantId) ?? 0;
  const allowed = clampToSellable(desired, sellable);

  if (allowed <= 0) {
    throw new CartError("That item is sold out.", "sold_out");
  }
  if (allowed > MAX_LINE_QUANTITY) {
    throw new CartError(
      `You can order at most ${MAX_LINE_QUANTITY} of this item.`,
      "quantity_limit",
    );
  }

  if (existing) {
    const { error: updateError } = await db
      .from("cart_items")
      .update({ quantity: allowed })
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await db
    .from("cart_items")
    .insert({ cart_id: cartId, variant_id: variantId, quantity: allowed });
  if (insertError) throw insertError;
}

/** Set an explicit line quantity. A quantity of 0 removes the line. */
export async function updateItemQuantity(
  cartId: string,
  itemId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) return removeItem(cartId, itemId);

  const parsed = quantitySchema.safeParse(quantity);
  if (!parsed.success) {
    throw new CartError(
      `Quantity must be between 1 and ${MAX_LINE_QUANTITY}.`,
      "invalid_quantity",
    );
  }

  const db = createAdminClient();
  const { data: item, error } = await db
    .from("cart_items")
    .select("id, variant_id")
    .eq("id", itemId)
    .eq("cart_id", cartId)
    .maybeSingle();
  if (error) throw error;
  if (!item) throw new CartError("That cart line no longer exists.", "line_missing");

  const availability = await resolveSellableQuantities([item.variant_id]);
  const allowed = clampToSellable(parsed.data, availability.get(item.variant_id) ?? 0);
  if (allowed <= 0) {
    throw new CartError("That item is sold out.", "sold_out");
  }

  const { error: updateError } = await db
    .from("cart_items")
    .update({ quantity: allowed })
    .eq("id", item.id);
  if (updateError) throw updateError;
}

export async function removeItem(cartId: string, itemId: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("cart_items")
    .delete()
    .eq("id", itemId)
    .eq("cart_id", cartId);
  if (error) throw error;
}

/**
 * Hydrate a cart with current prices and availability.
 *
 * Prices are read fresh every time, so a price change in Studio is reflected
 * immediately rather than being frozen at add-to-cart time. The price is only
 * committed when the durable checkout snapshot is written.
 */
export async function getCart(cartId: string): Promise<Cart | null> {
  const db = createAdminClient();

  const { data: cart, error } = await db
    .from("carts")
    .select("id, session_token, customer_id, currency, status")
    .eq("id", cartId)
    .maybeSingle();
  if (error) throw error;
  if (!cart || cart.status !== "active") return null;

  const { data: items, error: itemsError } = await db
    .from("cart_items")
    .select("id, variant_id, quantity")
    .eq("cart_id", cartId)
    .order("created_at");
  if (itemsError) throw itemsError;

  if (!items || items.length === 0) {
    return {
      id: cart.id,
      sessionToken: cart.session_token,
      customerId: cart.customer_id,
      currency: cart.currency,
      lines: [],
      subtotalCents: 0,
      hasBlockingIssues: false,
    };
  }

  const variantIds = items.map((i) => i.variant_id);

  const { data: variants, error: variantError } = await db
    .from("product_variants")
    .select(
      "id, product_id, title, sku, price_cents, currency, active, products(handle, title, status, kind)",
    )
    .in("id", variantIds);
  if (variantError) throw variantError;

  type VariantJoin = {
    id: string;
    product_id: string;
    title: string;
    sku: string | null;
    price_cents: number;
    currency: string;
    active: boolean;
    products: {
      handle: string;
      title: string;
      status: string;
      kind: string;
    } | null;
  };

  const byId = new Map(
    ((variants ?? []) as unknown as VariantJoin[]).map((v) => [v.id, v]),
  );

  const [availability, thresholds, options] = await Promise.all([
    resolveSellableQuantities(variantIds),
    getStockThresholds(),
    resolveVariantOptions(variantIds),
  ]);

  const lines: CartLine[] = [];
  let subtotal = 0;
  let blocking = false;

  for (const item of items) {
    const variant = byId.get(item.variant_id);
    if (!variant || !variant.active || variant.products?.status !== "active") {
      // A line whose variant or product was archived is surfaced, not dropped —
      // the customer needs to see why their cart changed.
      blocking = true;
      continue;
    }

    const sellable = availability.get(item.variant_id) ?? 0;
    const lineTotal = variant.price_cents * item.quantity;
    subtotal += lineTotal;

    const overCommitted = sellable !== null && item.quantity > sellable;
    if (overCommitted || (sellable !== null && sellable <= 0)) blocking = true;

    lines.push({
      itemId: item.id,
      variantId: variant.id,
      productId: variant.product_id,
      productHandle: variant.products.handle,
      productTitle: variant.products.title,
      variantTitle: variant.title,
      sku: variant.sku,
      options: options.get(variant.id) ?? {},
      isBundle: variant.products.kind === "bundle",
      quantity: item.quantity,
      unitPriceCents: variant.price_cents,
      lineTotalCents: lineTotal,
      currency: variant.currency,
      sellableQuantity: sellable,
      stockState: stockState(sellable, thresholds),
      needsAttention: overCommitted,
    });
  }

  return {
    id: cart.id,
    sessionToken: cart.session_token,
    customerId: cart.customer_id,
    currency: cart.currency,
    lines,
    subtotalCents: subtotal,
    hasBlockingIssues: blocking,
  };
}

/** Option name/value pairs for display on cart and checkout lines. */
async function resolveVariantOptions(
  variantIds: string[],
): Promise<Map<string, Record<string, string>>> {
  const db = createAdminClient();
  const byVariant = new Map<string, Record<string, string>>();
  if (variantIds.length === 0) return byVariant;

  const { data: links, error } = await db
    .from("variant_option_values")
    .select("variant_id, option_id, option_value_id")
    .in("variant_id", variantIds);
  if (error) throw error;
  if (!links || links.length === 0) return byVariant;

  const [{ data: options }, { data: values }] = await Promise.all([
    db
      .from("product_options")
      .select("id, name")
      .in("id", [...new Set(links.map((l) => l.option_id))]),
    db
      .from("product_option_values")
      .select("id, value")
      .in("id", [...new Set(links.map((l) => l.option_value_id))]),
  ]);

  const optionName = new Map((options ?? []).map((o) => [o.id, o.name]));
  const optionValue = new Map((values ?? []).map((v) => [v.id, v.value]));

  for (const link of links) {
    const name = optionName.get(link.option_id);
    const value = optionValue.get(link.option_value_id);
    if (!name || !value) continue;
    const current = byVariant.get(link.variant_id) ?? {};
    current[name] = value;
    byVariant.set(link.variant_id, current);
  }

  return byVariant;
}

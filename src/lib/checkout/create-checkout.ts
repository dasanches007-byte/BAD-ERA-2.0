import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/db/admin";
import { getCart } from "@/lib/cart/service";
import { resolvePhysicalComponents } from "@/lib/catalog/availability-lookup";
import { reserveCheckoutInventory } from "@/lib/db/commerce-rpc";
import { getFlatShippingCents, getStoreCurrency } from "@/lib/settings/store";
import { getStripe } from "@/lib/payments/stripe/client";
import { serverEnv } from "@/lib/env/server";
import type { Enums } from "@/lib/db/generated.types";

/**
 * Checkout creation.
 *
 * Implements the locked invariant (Kickoff v0.2 §3):
 *
 *   cart
 *     -> server validation
 *     -> checkout_sessions + checkout_lines + checkout_line_components
 *     -> reserve_checkout_inventory()
 *     -> Stripe Checkout
 *
 * The snapshot is durable: once the customer leaves for Stripe, payment no
 * longer depends on a mutable cart or a mutable product record. Prices,
 * titles, options, fulfillment mode and provider are all frozen here.
 *
 * Inventory is reserved BEFORE the Stripe session exists. If session creation
 * then fails, the reservation is released rather than stranded.
 */

/** How long a reservation is held while the customer pays. */
const RESERVATION_MINUTES = 30;

export class CheckoutError extends Error {
  readonly status: number;

  constructor(
    message: string,
    readonly code: string,
    status = 400,
  ) {
    super(message);
    this.name = "CheckoutError";
    this.status = status;
  }
}

/**
 * Shipping address gate (Master Spec §6.2).
 *
 * Required: recipient name, line 1, city, region, postal code, country.
 * Phone is optional. The apartment/unit line is preserved.
 *
 * This validates syntactic completeness only. It deliberately does NOT claim
 * deliverability — promising that would be a fabricated shipping guarantee.
 */
export const shippingAddressSchema = z.object({
  name: z.string().trim().min(1, "Recipient name is required"),
  line1: z.string().trim().min(1, "Address is required"),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  region: z.string().trim().min(1, "State or region is required"),
  postalCode: z.string().trim().min(1, "Postal code is required"),
  country: z
    .string()
    .trim()
    .length(2, "Country must be a 2-letter ISO code")
    .transform((v) => v.toUpperCase()),
  phone: z.string().trim().optional(),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const createCheckoutSchema = z.object({
  cartId: z.uuid(),
  email: z.email("A valid email address is required"),
  shippingAddress: shippingAddressSchema,
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export type CreateCheckoutResult = {
  checkoutSessionId: string;
  stripeSessionId: string;
  redirectUrl: string;
};

type VariantSnapshot = {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  price_cents: number;
  currency: string;
  active: boolean;
  inventory_mode: Enums<"inventory_mode">;
  fulfillment_provider_id: string | null;
};

/**
 * Create a durable checkout snapshot, reserve stock and open a Stripe session.
 */
export async function createCheckout(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  const parsed = createCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    throw new CheckoutError(
      parsed.error.issues[0]?.message ?? "Invalid checkout details.",
      "invalid_input",
    );
  }
  const { cartId, email, shippingAddress } = parsed.data;

  const db = createAdminClient();

  // --- 1. Validate the cart server-side -----------------------------------
  const cart = await getCart(cartId);
  if (!cart) throw new CheckoutError("Your cart has expired.", "cart_not_found", 404);
  if (cart.lines.length === 0) {
    throw new CheckoutError("Your cart is empty.", "cart_empty");
  }
  if (cart.hasBlockingIssues) {
    throw new CheckoutError(
      "Some items in your cart are no longer available. Please review your cart.",
      "cart_unavailable",
      409,
    );
  }

  // Re-read variants directly rather than trusting the hydrated cart: this is
  // the record that gets frozen into the snapshot.
  const { data: variantRows, error: variantError } = await db
    .from("product_variants")
    .select(
      "id, product_id, title, sku, price_cents, currency, active, inventory_mode, fulfillment_provider_id",
    )
    .in(
      "id",
      cart.lines.map((l) => l.variantId),
    );
  if (variantError) throw variantError;

  const variantById = new Map(
    ((variantRows ?? []) as VariantSnapshot[]).map((v) => [v.id, v]),
  );

  const currency = await getStoreCurrency();
  for (const line of cart.lines) {
    const variant = variantById.get(line.variantId);
    if (!variant || !variant.active) {
      throw new CheckoutError(
        "Some items in your cart are no longer available.",
        "variant_inactive",
        409,
      );
    }
    if (variant.currency !== currency) {
      throw new CheckoutError(
        "Your cart contains items in more than one currency.",
        "mixed_currency",
        409,
      );
    }
  }

  // --- 2. Totals, derived entirely server-side -----------------------------
  const shippingCents = await getFlatShippingCents();
  const subtotalCents = cart.lines.reduce(
    (sum, line) => sum + variantById.get(line.variantId)!.price_cents * line.quantity,
    0,
  );
  // Tax is handled by the configured Stripe tax strategy; BAD ERA does not
  // invent a rate here. Discounts arrive in a later phase.
  const discountCents = 0;
  const taxCents = 0;
  const totalCents = subtotalCents - discountCents + shippingCents + taxCents;

  const reservationExpiresAt = new Date(
    Date.now() + RESERVATION_MINUTES * 60_000,
  ).toISOString();

  // --- 3. Durable snapshot -------------------------------------------------
  const { data: session, error: sessionError } = await db
    .from("checkout_sessions")
    .insert({
      cart_id: cart.id,
      customer_id: cart.customerId,
      status: "prepared",
      currency,
      customer_email: email,
      customer_phone: shippingAddress.phone ?? null,
      customer_snapshot: { email, name: shippingAddress.name },
      shipping_address_snapshot: shippingAddress,
      shipping_method_snapshot: { type: "flat_rate", amount_cents: shippingCents },
      subtotal_cents: subtotalCents,
      discount_cents: discountCents,
      shipping_cents: shippingCents,
      tax_cents: taxCents,
      total_cents: totalCents,
      reservation_expires_at: reservationExpiresAt,
    })
    .select("id")
    .single();
  if (sessionError) throw sessionError;

  const checkoutSessionId = session.id;

  try {
    const defaultLocationId = await getDefaultLocationId();

    for (const [index, line] of cart.lines.entries()) {
      const variant = variantById.get(line.variantId)!;
      const lineTotal = variant.price_cents * line.quantity;

      const { data: insertedLine, error: lineError } = await db
        .from("checkout_lines")
        .insert({
          checkout_session_id: checkoutSessionId,
          source_cart_item_id: line.itemId,
          line_key: `${index}:${variant.id}`,
          product_id: variant.product_id,
          variant_id: variant.id,
          product_handle_snapshot: line.productHandle,
          product_title_snapshot: line.productTitle,
          variant_title_snapshot: variant.title,
          sku_snapshot: variant.sku,
          options_snapshot: line.options,
          display_snapshot: {
            title: line.productTitle,
            variant: variant.title,
            options: line.options,
          },
          fulfillment_mode_snapshot: variant.inventory_mode,
          provider_id_snapshot: variant.fulfillment_provider_id,
          quantity: line.quantity,
          unit_price_cents: variant.price_cents,
          discount_cents: 0,
          tax_cents: 0,
          line_total_cents: lineTotal,
          is_bundle: line.isBundle,
        })
        .select("id")
        .single();
      if (lineError) throw lineError;

      // A bundle resolves to its physical components; a standalone variant
      // resolves to itself. Reservations act on components, never on a bundle.
      const components = await resolvePhysicalComponents(variant.id, line.quantity);

      for (const component of components) {
        const componentVariant =
          component.componentVariantId === variant.id
            ? variant
            : await loadVariantSnapshot(component.componentVariantId);

        const componentRow = {
          checkout_line_id: insertedLine.id,
          component_variant_id: component.componentVariantId,
          component_title_snapshot: componentVariant.title,
          component_sku_snapshot: componentVariant.sku,
          fulfillment_mode_snapshot: componentVariant.inventory_mode,
          provider_id_snapshot: componentVariant.fulfillment_provider_id,
          // Only stocked components carry a location; the schema enforces this.
          location_id_snapshot:
            componentVariant.inventory_mode === "stocked" ? defaultLocationId : null,
          quantity_per_parent: component.quantityPerParent,
          total_quantity: component.totalQuantity,
        };

        const { error: componentError } = await db
          .from("checkout_line_components")
          .insert(componentRow);
        if (componentError) throw componentError;
      }
    }

    // --- 4. Reserve stock atomically --------------------------------------
    // Row-locked inside PostgreSQL. Two customers racing for the last unit:
    // exactly one succeeds (acceptance case 1).
    await reserveCheckoutInventory(checkoutSessionId);

    // --- 5. Stripe Checkout Session ----------------------------------------
    const env = serverEnv();
    const stripe = getStripe();

    const stripeSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: email,
        client_reference_id: checkoutSessionId,
        line_items: cart.lines.map((line) => {
          const variant = variantById.get(line.variantId)!;
          return {
            quantity: line.quantity,
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: variant.price_cents,
              product_data: {
                name: line.productTitle,
                description: variant.title,
              },
            },
          };
        }),
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              display_name: "Shipping",
              fixed_amount: {
                amount: shippingCents,
                currency: currency.toLowerCase(),
              },
            },
          },
        ],
        // The reservation window is the payment window.
        expires_at: Math.floor(Date.parse(reservationExpiresAt) / 1000),
        success_url: `${env.NEXT_PUBLIC_SITE_URL}/checkout/success?checkout=${checkoutSessionId}`,
        cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/checkout/cancelled?checkout=${checkoutSessionId}`,
        metadata: { bad_era_checkout_session_id: checkoutSessionId },
      },
      {
        // Retrying this request must never open a second Stripe session for the
        // same durable checkout.
        idempotencyKey: `checkout:${checkoutSessionId}`,
      },
    );

    if (!stripeSession.url) {
      throw new CheckoutError(
        "Stripe did not return a checkout URL.",
        "stripe_no_url",
        502,
      );
    }

    const { error: updateError } = await db
      .from("checkout_sessions")
      .update({
        status: "stripe_created",
        stripe_checkout_session_id: stripeSession.id,
        stripe_expires_at: stripeSession.expires_at
          ? new Date(stripeSession.expires_at * 1000).toISOString()
          : null,
      })
      .eq("id", checkoutSessionId);
    if (updateError) throw updateError;

    return {
      checkoutSessionId,
      stripeSessionId: stripeSession.id,
      redirectUrl: stripeSession.url,
    };
  } catch (error) {
    // Never strand a reservation because the Stripe hop failed. Release is
    // idempotent, so this is safe even if nothing was reserved yet.
    await releaseQuietly(checkoutSessionId);
    throw error;
  }
}

/**
 * Best-effort release during checkout-creation failure.
 *
 * A failure to release must not mask the original error; the expiry sweep
 * (`release_expired_checkout_inventory`) is the backstop.
 */
async function releaseQuietly(checkoutSessionId: string): Promise<void> {
  try {
    const db = createAdminClient();
    await db.rpc("release_checkout_inventory", {
      p_checkout_session_id: checkoutSessionId,
      p_checkout_status: "cancelled",
    });
  } catch (releaseError) {
    console.error(
      "[bad-era] failed to release reservation after checkout error",
      { checkoutSessionId, releaseError },
    );
  }
}

async function loadVariantSnapshot(variantId: string): Promise<VariantSnapshot> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("product_variants")
    .select(
      "id, product_id, title, sku, price_cents, currency, active, inventory_mode, fulfillment_provider_id",
    )
    .eq("id", variantId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new CheckoutError(
      "A product in your cart is no longer available.",
      "component_missing",
      409,
    );
  }
  return data as VariantSnapshot;
}

async function getDefaultLocationId(): Promise<string> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("inventory_locations")
    .select("id")
    .eq("active", true)
    .eq("fulfills_online_orders", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new CheckoutError(
      "No fulfillment location is configured.",
      "no_location",
      409,
    );
  }
  return data.id;
}

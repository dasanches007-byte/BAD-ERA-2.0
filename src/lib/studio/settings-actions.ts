"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  StudioAuthorizationError,
  StudioMfaRequiredError,
  requireStudioOwner,
} from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";
import type { Json } from "@/lib/db/generated.types";
import { EXAMPLE_ORDER, renderOrderConfirmationEmail } from "@/lib/email/order-confirmation";
import { sendEmail } from "@/lib/email/resend";
import { serverEnv } from "@/lib/env/server";
import {
  SETTING_KEYS,
  orderEmailWordsSchema,
  readOrderEmailWords,
} from "@/lib/settings/store";
import {
  MAX_SHIPPING_CENTS,
  parseMoneyToCents,
} from "@/lib/settings/shipping";

/**
 * Store settings the owner changes from Studio → Settings.
 *
 * Each value is a `site_settings` row, read by the domain layer at the moment
 * it is needed (checkout reads shipping when it builds the order), so a change
 * here reaches the next checkout with no deploy. Authorization is checked
 * here; every write is recorded in `audit_events` with the owner's id.
 */

export type SettingsResult = { ok: true } | { ok: false; message: string };

async function studioOwner(): Promise<{ userId: string } | { message: string }> {
  try {
    return { userId: (await requireStudioOwner()).userId };
  } catch (error) {
    if (error instanceof StudioMfaRequiredError) {
      return { message: "Enter your authenticator code first." };
    }
    if (error instanceof StudioAuthorizationError) {
      return { message: "Studio authorization required." };
    }
    throw error;
  }
}

const shippingSchema = z.object({
  flatRate: z.string().max(20),
  freeOver: z.string().max(20),
});

/**
 * Save the shipping rule: a flat charge per order, and optionally an order
 * amount from which shipping is free. The flat charge is required (0 is
 * allowed: always free); a blank "free over" removes that rule.
 */
export async function saveShippingAction(input: unknown): Promise<SettingsResult> {
  const parsed = shippingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Enter amounts in dollars, like 8.00." };

  const owner = await studioOwner();
  if ("message" in owner) return { ok: false, message: owner.message };

  const flatRateCents = parseMoneyToCents(parsed.data.flatRate);
  if (flatRateCents === null) {
    return { ok: false, message: "Enter the shipping charge in dollars, like 8.00 (0 for free)." };
  }
  if (flatRateCents > MAX_SHIPPING_CENTS) {
    return { ok: false, message: "That shipping charge looks too high. Check for an extra digit." };
  }

  const freeOverText = parsed.data.freeOver.trim();
  let freeOverCents: number | null = null;
  if (freeOverText) {
    freeOverCents = parseMoneyToCents(freeOverText);
    if (freeOverCents === null || freeOverCents === 0) {
      return {
        ok: false,
        message: "Enter the free-shipping amount in dollars, like 100.00, or leave it empty.",
      };
    }
  }

  const db = createAdminClient();
  const now = new Date().toISOString();

  const { error: flatError } = await db.from("site_settings").upsert(
    {
      key: SETTING_KEYS.shippingFlatRateCents,
      value: flatRateCents,
      visibility: "studio",
      updated_by: owner.userId,
      updated_at: now,
    },
    { onConflict: "key" },
  );
  if (flatError) {
    console.error("[bad-era] shipping setting save failed", flatError);
    return { ok: false, message: "Could not save shipping. Try again." };
  }

  const { error: freeError } =
    freeOverCents === null
      ? await db.from("site_settings").delete().eq("key", SETTING_KEYS.shippingFreeThresholdCents)
      : await db.from("site_settings").upsert(
          {
            key: SETTING_KEYS.shippingFreeThresholdCents,
            value: freeOverCents,
            visibility: "studio",
            updated_by: owner.userId,
            updated_at: now,
          },
          { onConflict: "key" },
        );
  if (freeError) {
    console.error("[bad-era] free shipping setting save failed", freeError);
    return {
      ok: false,
      message: "The shipping charge saved, but the free-shipping amount did not. Try again.",
    };
  }

  await db.from("audit_events").insert({
    action: "settings.shipping.updated",
    entity_type: "site_setting",
    actor_user_id: owner.userId,
    metadata: { flat_rate_cents: flatRateCents, free_over_cents: freeOverCents } as Json,
  });

  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  revalidatePath("/checkout");
  return { ok: true };
}

/**
 * Save the order confirmation email's words. The layout is fixed; only these
 * five pieces of text are the owner's. The next paid order uses them.
 */
export async function saveOrderEmailWordsAction(input: unknown): Promise<SettingsResult> {
  const parsed = orderEmailWordsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the email's words." };
  }

  const owner = await studioOwner();
  if ("message" in owner) return { ok: false, message: owner.message };

  const db = createAdminClient();
  const { error } = await db.from("site_settings").upsert(
    {
      key: SETTING_KEYS.orderEmailWords,
      value: parsed.data as Json,
      visibility: "studio",
      updated_by: owner.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) {
    console.error("[bad-era] order email words save failed", error);
    return { ok: false, message: "Could not save the email. Try again." };
  }

  await db.from("audit_events").insert({
    action: "settings.order_email.updated",
    entity_type: "site_setting",
    actor_user_id: owner.userId,
    metadata: {} as Json,
  });

  revalidatePath("/studio/settings");
  return { ok: true };
}

const testEmailSchema = z.object({ to: z.email("Enter the address to send the test to.") });

/**
 * Send the order email, filled with the example order, to an address the
 * owner names: the way to see it in a real inbox, and to check email is set
 * up, before the first customer pays. Uses the SAVED words.
 */
export async function sendTestOrderEmailAction(input: unknown): Promise<SettingsResult> {
  const parsed = testEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Enter an email address." };
  }

  const owner = await studioOwner();
  if ("message" in owner) return { ok: false, message: owner.message };

  const words = await readOrderEmailWords();
  const email = renderOrderConfirmationEmail(EXAMPLE_ORDER, words, serverEnv().NEXT_PUBLIC_SITE_URL);
  const result = await sendEmail({
    to: parsed.data.to,
    subject: `[Test] ${email.subject}`,
    html: email.html,
    text: email.text,
    replyTo: words.replyTo || null,
    idempotencyKey: `test-order-email/${owner.userId}/${Date.now()}`,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: result.notConfigured
        ? "Email isn't set up yet: add the Resend key and sending address in Railway first."
        : result.message,
    };
  }
  return { ok: true };
}

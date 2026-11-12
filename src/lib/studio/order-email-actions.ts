"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  StudioAuthorizationError,
  StudioMfaRequiredError,
  requireStudioOwner,
} from "@/lib/auth/studio";
import { sendOrderConfirmation } from "@/lib/email/order-emails";

/**
 * The owner sends an order's confirmation email from the order page: for a
 * customer who says it never arrived, or for an order paid before email was
 * set up. Uses a fresh idempotency key, so it is a real second delivery.
 */

export type OrderEmailActionResult = { ok: true } | { ok: false; message: string };

export async function sendOrderConfirmationAction(input: unknown): Promise<OrderEmailActionResult> {
  const parsed = z.object({ orderId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Unknown order." };

  try {
    await requireStudioOwner();
  } catch (error) {
    if (error instanceof StudioMfaRequiredError) {
      return { ok: false, message: "Enter your authenticator code first." };
    }
    if (error instanceof StudioAuthorizationError) {
      return { ok: false, message: "Studio authorization required." };
    }
    throw error;
  }

  const result = await sendOrderConfirmation(parsed.data.orderId, "manual");
  revalidatePath(`/studio/orders/${parsed.data.orderId}`);
  if (result.ok) return { ok: true };
  return {
    ok: false,
    message:
      result.reason === "not_configured"
        ? "Email isn't set up yet: add the Resend key and sending address in Railway first."
        : result.message,
  };
}

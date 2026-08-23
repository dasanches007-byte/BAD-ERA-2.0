"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAccountIdentity } from "@/lib/account/session";
import { requireStudioOwner, StudioAuthorizationError } from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";
import { RATE_LIMITS, checkRateLimit } from "@/lib/security/rate-limit";

/**
 * Support mutations (Master Spec §9.2).
 *
 * Messages and notes are separate tables and separate actions. An internal note
 * has no `customer_visible` flag to get wrong — it simply lives somewhere the
 * customer view never reads from.
 */

export type SupportResult = { ok: true; id?: string } | { ok: false; message: string };

async function studioOwner(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  try {
    const identity = await requireStudioOwner();
    return { ok: true, userId: identity.userId };
  } catch (error) {
    if (error instanceof StudioAuthorizationError) {
      return { ok: false, message: "Studio authorization required." };
    }
    throw error;
  }
}

const openCaseSchema = z.object({
  subject: z.string().trim().min(1, "Add a subject").max(200),
  body: z.string().trim().min(1, "Tell us what is going on").max(4000),
  orderNumber: z.string().max(40).optional(),
});

/** A customer opens a case. */
export async function openSupportCaseAction(
  formData: FormData,
): Promise<SupportResult> {
  const identity = await getAccountIdentity();
  if (!identity) {
    return { ok: false, message: "Please sign in so we can link this to your orders." };
  }

  /**
   * Rate limit per customer (Master Spec §17). Keyed on the customer id, not
   * the IP: this path is already authenticated, so the identity is the honest
   * subject and a shared office network is not punished for one person.
   *
   * This bucket fails OPEN — a customer with a real problem must never be
   * blocked from reaching the owner because a counter table is unreachable.
   */
  const limit = await checkRateLimit(
    RATE_LIMITS.supportCase,
    `customer:${identity.customerId}`,
  );
  if (!limit.allowed) return { ok: false, message: limit.message };

  const parsed = openCaseSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
    orderNumber: (formData.get("orderNumber") as string) || undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid message" };
  }

  const db = createAdminClient();
  let orderId: string | null = null;

  if (parsed.data.orderNumber) {
    // Only link an order the caller actually owns.
    const { data: order } = await db
      .from("orders")
      .select("id")
      .eq("order_number", parsed.data.orderNumber)
      .eq("customer_id", identity.customerId)
      .maybeSingle();
    orderId = order?.id ?? null;
  }

  const { data: created, error } = await db
    .from("support_cases")
    .insert({
      customer_id: identity.customerId,
      order_id: orderId,
      subject: parsed.data.subject,
      status: "open",
      priority: "normal",
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  const { error: messageError } = await db.from("support_messages").insert({
    case_id: created.id,
    author_type: "customer",
    author_user_id: identity.authUserId,
    body: parsed.data.body,
    customer_visible: true,
  });

  if (messageError) return { ok: false, message: messageError.message };

  revalidatePath("/account/support");
  revalidatePath("/studio/support");
  return { ok: true, id: created.id };
}

/** The owner replies. Always customer-visible — that is what a reply is. */
export async function replyToCaseAction(input: {
  caseId: string;
  body: string;
}): Promise<SupportResult> {
  const auth = await studioOwner();
  if (!auth.ok) return auth;

  if (!input.body.trim()) return { ok: false, message: "Write a reply first." };

  const db = createAdminClient();
  const { error } = await db.from("support_messages").insert({
    case_id: input.caseId,
    author_type: "studio_user",
    author_user_id: auth.userId,
    body: input.body.trim(),
    customer_visible: true,
  });

  if (error) return { ok: false, message: error.message };

  // Replying moves the case to waiting on the customer.
  await db
    .from("support_cases")
    .update({ status: "waiting_customer" })
    .eq("id", input.caseId);

  revalidatePath(`/studio/support/${input.caseId}`);
  revalidatePath("/studio/support");
  return { ok: true };
}

/**
 * Add an internal note.
 *
 * Notes go to `support_notes`, which no customer-facing query reads. There is
 * deliberately no visibility flag to misconfigure.
 */
export async function addCaseNoteAction(input: {
  caseId: string;
  body: string;
}): Promise<SupportResult> {
  const auth = await studioOwner();
  if (!auth.ok) return auth;

  if (!input.body.trim()) return { ok: false, message: "Write a note first." };

  const db = createAdminClient();
  const { error } = await db.from("support_notes").insert({
    case_id: input.caseId,
    author_user_id: auth.userId,
    body: input.body.trim(),
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/studio/support/${input.caseId}`);
  return { ok: true };
}

export async function setCaseStatusAction(input: {
  caseId: string;
  status: "open" | "waiting_customer" | "waiting_internal" | "resolved" | "closed";
}): Promise<SupportResult> {
  const auth = await studioOwner();
  if (!auth.ok) return auth;

  const db = createAdminClient();
  const { error } = await db
    .from("support_cases")
    .update({
      status: input.status,
      closed_at:
        input.status === "closed" ? new Date().toISOString() : null,
    })
    .eq("id", input.caseId);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/studio/support/${input.caseId}`);
  revalidatePath("/studio/support");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStudioOwner, StudioAuthorizationError } from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";
import type { Enums } from "@/lib/db/generated.types";

/**
 * Inventory adjustment (Master Spec §10.3.4, §14.2).
 *
 * Defence in depth, deliberately doubled:
 *   1. `requireStudioOwner()` re-verifies authorization server-side. A hidden
 *      or disabled button is never authorization (Master Spec §16.1).
 *   2. `studio_adjust_inventory` re-verifies ownership again inside PostgreSQL,
 *      rejects system-only reasons, takes a row lock, and writes the
 *      append-only movement record in the same transaction.
 *
 * Step 2 is the real boundary. Step 1 exists so the UI can fail early with a
 * useful message instead of surfacing a raw database exception.
 */

const adjustSchema = z.object({
  variantId: z.uuid(),
  locationId: z.uuid(),
  // Zero is rejected by the RPC too; catching it here gives a better message.
  delta: z.number().int().refine((n) => n !== 0, "Enter a non-zero adjustment"),
  reason: z.string().min(1),
  note: z.string().max(500).optional(),
});

export type AdjustResult =
  | { ok: true; resultingOnHand: number }
  | { ok: false; message: string };

export async function adjustInventoryAction(
  input: unknown,
): Promise<AdjustResult> {
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid adjustment" };
  }

  try {
    await requireStudioOwner();
  } catch (error) {
    if (error instanceof StudioAuthorizationError) {
      return { ok: false, message: "Studio authorization required." };
    }
    throw error;
  }

  const { variantId, locationId, delta, reason, note } = parsed.data;
  const db = createAdminClient();

  const { data, error } = await db.rpc("studio_adjust_inventory", {
    p_variant_id: variantId,
    p_location_id: locationId,
    p_delta_on_hand: delta,
    p_reason: reason as Enums<"inventory_reason">,
    p_note: note?.trim() ? note.trim() : undefined,
  });

  if (error) {
    console.error("[bad-era] studio_adjust_inventory failed", error);
    // Surface the database's own reason: "would make on_hand lower than
    // committed + unavailable" is genuinely useful to the owner, whereas a
    // generic failure is not.
    return { ok: false, message: error.message };
  }

  const after = data as { on_hand?: number } | null;

  revalidatePath("/studio/inventory");
  revalidatePath("/studio");

  return { ok: true, resultingOnHand: after?.on_hand ?? 0 };
}

/**
 * Set an absolute quantity for a physical recount.
 *
 * Implemented as a delta so it still produces one auditable movement record
 * rather than an untracked overwrite (Master Spec §10.3.4).
 */
export async function setInventoryAction(input: {
  variantId: string;
  locationId: string;
  currentOnHand: number;
  targetOnHand: number;
  note?: string;
}): Promise<AdjustResult> {
  const target = Number(input.targetOnHand);
  if (!Number.isInteger(target) || target < 0) {
    return { ok: false, message: "Enter a whole number of units, zero or more." };
  }

  const delta = target - Number(input.currentOnHand);
  if (delta === 0) {
    return { ok: false, message: "That is already the quantity on hand." };
  }

  return adjustInventoryAction({
    variantId: input.variantId,
    locationId: input.locationId,
    delta,
    reason: "stock_recount",
    note: input.note,
  });
}

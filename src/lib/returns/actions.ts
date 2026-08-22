"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAccountIdentity } from "@/lib/account/session";
import { requireStudioOwner, StudioAuthorizationError } from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";
import type { Enums, Json } from "@/lib/db/generated.types";
import { getReturnWindowDays } from "@/lib/settings/store";
import {
  allowedReturnTransitions,
  checkReturnEligibility,
} from "@/lib/returns/types";

/**
 * Returns mutations (Master Spec §9.1, §10.3.7).
 *
 * The three lifecycles stay separate on purpose:
 *
 *   RETURN    requested -> approved -> received -> closed
 *   REFUND    a Stripe operation, in `src/lib/refunds/actions.ts`
 *   RESTOCK   an explicit per-item decision, only after inspection
 *
 * Approving a return does NOT refund it, and refunding does NOT restock. A
 * damaged item that came back must never silently become sellable again
 * (Master Spec §9.1: "do not automatically restock every refund").
 */

export type ReturnResult = { ok: true; id?: string } | { ok: false; message: string };

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

async function audit(
  action: string,
  entityId: string,
  actorUserId: string | null,
  metadata: Record<string, unknown>,
): Promise<void> {
  const db = createAdminClient();
  await db.from("audit_events").insert({
    action,
    entity_type: "return",
    entity_id: entityId,
    actor_user_id: actorUserId,
    metadata: metadata as Json,
  });
}

const requestSchema = z.object({
  orderNumber: z.string().min(1),
  reason: z.string().min(1, "Choose a reason"),
  note: z.string().max(2000).optional(),
  items: z
    .array(z.object({ orderItemId: z.uuid(), quantity: z.number().int().positive() }))
    .min(1, "Choose at least one item to return"),
});

/**
 * Customer requests a return.
 *
 * Eligibility and per-line quantities are re-checked server-side. A form can
 * claim any quantity it likes; only the order's own history decides what is
 * actually returnable.
 */
export async function requestReturnAction(input: unknown): Promise<ReturnResult> {
  const identity = await getAccountIdentity();
  if (!identity) return { ok: false, message: "Please sign in again." };

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const db = createAdminClient();
  const { orderNumber, reason, note, items } = parsed.data;

  const { data: order, error: orderError } = await db
    .from("orders")
    .select(
      `id, paid_at, fulfillment_status,
       order_items(id, quantity, return_items(quantity, returns!inner(status)))`,
    )
    .eq("order_number", orderNumber)
    // Ownership: the order must belong to the caller.
    .eq("customer_id", identity.customerId)
    .maybeSingle();

  if (orderError) return { ok: false, message: orderError.message };
  if (!order) return { ok: false, message: "That order could not be found." };

  const windowDays = await getReturnWindowDays();
  const eligibility = checkReturnEligibility({
    paidAt: order.paid_at,
    fulfillmentStatus: order.fulfillment_status,
    windowDays,
  });
  if (!eligibility.eligible) return { ok: false, message: eligibility.reason };

  const orderItems = (order.order_items ?? []) as unknown as {
    id: string;
    quantity: number;
    return_items: { quantity: number; returns: { status: string } }[] | null;
  }[];

  // Re-derive what is returnable rather than trusting the submitted numbers.
  for (const requested of items) {
    const line = orderItems.find((i) => i.id === requested.orderItemId);
    if (!line) return { ok: false, message: "That item is not on this order." };

    const spent = (line.return_items ?? [])
      .filter((r) => !["rejected", "cancelled"].includes(r.returns.status))
      .reduce((sum, r) => sum + r.quantity, 0);

    if (requested.quantity > line.quantity - spent) {
      return {
        ok: false,
        message: "You have already requested a return for some of those units.",
      };
    }
  }

  const { data: created, error: createError } = await db
    .from("returns")
    .insert({
      order_id: order.id,
      customer_id: identity.customerId,
      status: "requested",
      reason,
      customer_note: note?.trim() || null,
    })
    .select("id, return_number")
    .single();

  if (createError) return { ok: false, message: createError.message };

  const { error: itemsError } = await db.from("return_items").insert(
    items.map((i) => ({
      return_id: created.id,
      order_item_id: i.orderItemId,
      quantity: i.quantity,
      // Condition and disposition are unknown until the owner inspects it.
      item_condition: "unknown" as Enums<"return_item_condition">,
      disposition: "manual_review" as Enums<"return_disposition">,
    })),
  );

  if (itemsError) return { ok: false, message: itemsError.message };

  await db
    .from("orders")
    .update({ return_status: "requested" })
    .eq("id", order.id);

  await audit("return.requested", created.id, null, {
    order_id: order.id,
    reason,
    item_count: items.length,
  });

  revalidatePath("/account/returns");
  revalidatePath("/studio/returns");
  return { ok: true, id: created.id };
}

const transitionSchema = z.object({
  returnId: z.uuid(),
  next: z.enum([
    "approved",
    "rejected",
    "in_transit",
    "received",
    "closed",
    "cancelled",
  ]),
  note: z.string().max(1000).optional(),
});

/**
 * Move a return through its lifecycle.
 *
 * Transitions are validated against the current status, so a return cannot
 * jump from requested straight to closed and skip inspection.
 *
 * Approving explicitly does NOT refund. That is a separate, deliberate action.
 */
export async function transitionReturnAction(
  input: unknown,
): Promise<ReturnResult> {
  const auth = await studioOwner();
  if (!auth.ok) return auth;

  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid transition" };
  }

  const { returnId, next, note } = parsed.data;
  const db = createAdminClient();

  const { data: current, error: readError } = await db
    .from("returns")
    .select("id, status, order_id")
    .eq("id", returnId)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };
  if (!current) return { ok: false, message: "That return no longer exists." };

  const allowed = allowedReturnTransitions(current.status);
  if (!allowed.includes(next)) {
    return {
      ok: false,
      message: `A ${current.status.replace(/_/g, " ")} return cannot move to ${next.replace(/_/g, " ")}.`,
    };
  }

  const now = new Date().toISOString();
  // Typed explicitly rather than as a loose record, so a mistyped column name
  // is a compile error instead of a silently ignored update.
  const patch: {
    status: Enums<"return_status">;
    approved_at?: string;
    received_at?: string;
    closed_at?: string;
  } = { status: next };

  if (next === "approved") patch.approved_at = now;
  if (next === "received") patch.received_at = now;
  if (next === "closed" || next === "rejected" || next === "cancelled") {
    patch.closed_at = now;
  }

  const { error } = await db.from("returns").update(patch).eq("id", returnId);
  if (error) return { ok: false, message: error.message };

  // Mirror onto the order's own return_status, which stays a separate field
  // from payment, fulfillment and refund (Master Spec §7.1).
  const orderReturnStatus: Enums<"order_return_status"> =
    next === "approved"
      ? "approved"
      : next === "in_transit"
        ? "in_transit"
        : next === "received"
          ? "received"
          : next === "rejected"
            ? "rejected"
            : next === "closed"
              ? "closed"
              : "none";

  await db
    .from("orders")
    .update({ return_status: orderReturnStatus })
    .eq("id", current.order_id);

  await audit(`return.${next}`, returnId, auth.userId, { note: note ?? null });

  revalidatePath("/studio/returns");
  revalidatePath(`/studio/returns/${returnId}`);
  return { ok: true };
}

const inspectSchema = z.object({
  returnItemId: z.uuid(),
  returnId: z.uuid(),
  condition: z.enum(["unopened", "resellable", "damaged", "unknown"]),
  disposition: z.enum(["restock", "damaged", "nonrestockable", "manual_review"]),
  notes: z.string().max(1000).optional(),
});

/** Record what actually came back, per item. Does not move stock by itself. */
export async function inspectReturnItemAction(
  input: unknown,
): Promise<ReturnResult> {
  const auth = await studioOwner();
  if (!auth.ok) return auth;

  const parsed = inspectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid inspection" };
  }

  const { returnItemId, returnId, condition, disposition, notes } = parsed.data;

  // A damaged item can never be dispositioned as restock. Allowing it would
  // put a broken unit back on the storefront.
  if (condition === "damaged" && disposition === "restock") {
    return {
      ok: false,
      message: "A damaged item cannot be put back into sellable stock.",
    };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("return_items")
    .update({
      item_condition: condition,
      disposition,
      notes: notes?.trim() || null,
    })
    .eq("id", returnItemId);

  if (error) return { ok: false, message: error.message };

  await audit("return.item_inspected", returnId, auth.userId, {
    return_item_id: returnItemId,
    condition,
    disposition,
  });

  revalidatePath(`/studio/returns/${returnId}`);
  return { ok: true };
}

/**
 * Put a returned unit back into sellable stock.
 *
 * DELIBERATELY SEPARATE from refunding. This is the only path that increases
 * inventory from a return, it requires the item to have been received and
 * dispositioned as restock, and it runs through `studio_adjust_inventory` so
 * the movement is audited like every other stock change.
 */
export async function restockReturnItemAction(input: {
  returnItemId: string;
  returnId: string;
}): Promise<ReturnResult> {
  const auth = await studioOwner();
  if (!auth.ok) return auth;

  const db = createAdminClient();

  const { data: item, error: readError } = await db
    .from("return_items")
    .select(
      `id, quantity, disposition, restocked_at,
       returns!inner(id, status),
       order_items!inner(variant_id)`,
    )
    .eq("id", input.returnItemId)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };
  if (!item) return { ok: false, message: "That return item no longer exists." };

  const ret = item.returns as unknown as { id: string; status: string };
  const orderItem = item.order_items as unknown as { variant_id: string };

  if (item.restocked_at) {
    return { ok: false, message: "That item has already been restocked." };
  }
  if (ret.status !== "received" && ret.status !== "closed") {
    return {
      ok: false,
      message: "Mark the return received before putting anything back into stock.",
    };
  }
  if (item.disposition !== "restock") {
    return {
      ok: false,
      message: "Set this item's disposition to restock after inspecting it.",
    };
  }

  // Find where to put it. V1 is a single internal location.
  const { data: location, error: locError } = await db
    .from("inventory_locations")
    .select("id")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (locError) return { ok: false, message: locError.message };
  if (!location) return { ok: false, message: "No active inventory location." };

  const { error: rpcError } = await db.rpc("studio_adjust_inventory", {
    p_variant_id: orderItem.variant_id,
    p_location_id: location.id,
    p_delta_on_hand: item.quantity,
    p_reason: "return_restock",
    p_note: `Restocked from return ${ret.id}`,
  });

  if (rpcError) {
    console.error("[bad-era] return restock failed", rpcError);
    return { ok: false, message: rpcError.message };
  }

  await db
    .from("return_items")
    .update({ restocked_at: new Date().toISOString() })
    .eq("id", input.returnItemId);

  await audit("return.item_restocked", input.returnId, auth.userId, {
    return_item_id: input.returnItemId,
    variant_id: orderItem.variant_id,
    quantity: item.quantity,
  });

  revalidatePath(`/studio/returns/${input.returnId}`);
  revalidatePath("/studio/inventory");
  return { ok: true };
}

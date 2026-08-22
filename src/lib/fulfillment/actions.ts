"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStudioOwner, StudioAuthorizationError } from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";
import type { Json } from "@/lib/db/generated.types";

/**
 * Fulfillment mutations (Master Spec §10.5.3, §10.5.6, §10.5.7).
 *
 * The rules these enforce, in order of importance:
 *
 *   1. A successful payment is durable order truth. Nothing here may cancel,
 *      erase or invalidate a paid order; these actions move FULFILLMENT state
 *      only.
 *   2. SUBMITTED is not SHIPPED. Recording a supplier reference never creates a
 *      shipment or notifies the customer.
 *   3. Retry reuses the group's existing submission key, so repeated clicks
 *      cannot produce a second provider order.
 *   4. Opening a supplier portal is not an action and changes no state — which
 *      is why there is deliberately no `openPortalAction` here.
 *   5. Every state change writes an append-only audit event with actor and
 *      timestamp.
 */

export type FulfillmentResult = { ok: true } | { ok: false; message: string };

async function owner(): Promise<
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
  actorUserId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const db = createAdminClient();
  await db.from("audit_events").insert({
    action,
    entity_type: "fulfillment_group",
    entity_id: entityId,
    actor_user_id: actorUserId,
    // Every value passed here is a primitive or null, so the shape is
    // JSON-serialisable; the cast satisfies the generated Json type.
    metadata: metadata as Json,
  });
}

const markSubmittedSchema = z.object({
  taskId: z.uuid(),
  fulfillmentGroupId: z.uuid(),
  supplierReference: z.string().trim().min(1, "Enter the supplier order reference"),
  actualCostCents: z.number().int().min(0).nullable(),
  notes: z.string().max(2000).optional(),
});

/**
 * Record a manual supplier submission (Master Spec §10.5.3).
 *
 * A reference number is REQUIRED. Without one there is no way to reconcile the
 * order with the supplier later, and "submitted" becomes an unverifiable claim.
 *
 * This moves the group to SUBMITTED. It does not ship anything.
 */
export async function markSupplierOrderSubmittedAction(
  input: unknown,
): Promise<FulfillmentResult> {
  const auth = await owner();
  if (!auth.ok) return auth;

  const parsed = markSubmittedSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid submission" };
  }

  const { taskId, fulfillmentGroupId, supplierReference, actualCostCents, notes } =
    parsed.data;
  const db = createAdminClient();

  const { data: existing, error: readError } = await db
    .from("supplier_tasks")
    .select("id, status, supplier_reference")
    .eq("id", taskId)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };
  if (!existing) return { ok: false, message: "That supplier task no longer exists." };

  // Never silently overwrite a recorded reference. Correcting one is an
  // explicit, separate decision with its own audit trail.
  if (existing.supplier_reference && existing.status === "submitted") {
    return {
      ok: false,
      message: `Already submitted as ${existing.supplier_reference}. Use Correct reference to change it.`,
    };
  }

  const submittedAt = new Date().toISOString();

  const { error } = await db
    .from("supplier_tasks")
    .update({
      status: "submitted",
      supplier_reference: supplierReference,
      actual_cost_cents: actualCostCents,
      submitted_by: auth.userId,
      submitted_at: submittedAt,
      notes: notes?.trim() || null,
    })
    .eq("id", taskId);

  if (error) return { ok: false, message: error.message };

  const { error: groupError } = await db
    .from("fulfillment_groups")
    .update({ canonical_status: "submitted", submitted_at: submittedAt })
    .eq("id", fulfillmentGroupId);

  if (groupError) return { ok: false, message: groupError.message };

  await audit("fulfillment.supplier_submitted", fulfillmentGroupId, auth.userId, {
    task_id: taskId,
    supplier_reference: supplierReference,
    actual_cost_cents: actualCostCents,
  });

  revalidatePath("/studio/fulfillment/supplier-orders");
  revalidatePath("/studio/fulfillment");
  return { ok: true };
}

const trackingSchema = z.object({
  fulfillmentGroupId: z.uuid(),
  orderId: z.uuid(),
  carrier: z.string().trim().min(1, "Enter the carrier"),
  trackingNumber: z.string().trim().min(1, "Enter the tracking number"),
  trackingUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Tracking URL must be http(s)")
    .optional(),
});

/**
 * Add tracking and mark the group shipped (Master Spec §8.1).
 *
 * This is the step that creates a shipment record and is the only thing that
 * turns SUBMITTED into SHIPPED. The same model is used whether the tracking
 * came from a manual entry or a provider webhook.
 */
export async function addTrackingAction(input: unknown): Promise<FulfillmentResult> {
  const auth = await owner();
  if (!auth.ok) return auth;

  const parsed = trackingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid tracking" };
  }

  const { fulfillmentGroupId, orderId, carrier, trackingNumber, trackingUrl } =
    parsed.data;
  const db = createAdminClient();
  const shippedAt = new Date().toISOString();

  const { data: shipment, error } = await db
    .from("shipments")
    .insert({
      fulfillment_group_id: fulfillmentGroupId,
      status: "shipped",
      carrier,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl?.trim() || null,
      shipped_at: shippedAt,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  const { error: groupError } = await db
    .from("fulfillment_groups")
    .update({ canonical_status: "shipped", shipped_at: shippedAt })
    .eq("id", fulfillmentGroupId);

  if (groupError) return { ok: false, message: groupError.message };

  await recomputeOrderFulfillmentStatus(orderId);

  await audit("fulfillment.tracking_added", fulfillmentGroupId, auth.userId, {
    shipment_id: shipment.id,
    carrier,
    tracking_number: trackingNumber,
  });

  revalidatePath("/studio/fulfillment/ready-to-ship");
  revalidatePath("/studio/fulfillment/shipments");
  revalidatePath(`/studio/orders/${orderId}`);
  return { ok: true };
}

/**
 * Recompute the ORDER's fulfillment status from its groups.
 *
 * Derived rather than set directly, so partial fulfillment is impossible to get
 * wrong: an order is only `fulfilled` when every group has shipped or been
 * delivered (Master Spec §7.1).
 */
async function recomputeOrderFulfillmentStatus(orderId: string): Promise<void> {
  const db = createAdminClient();

  const { data: groups, error } = await db
    .from("fulfillment_groups")
    .select("canonical_status")
    .eq("order_id", orderId);

  if (error || !groups || groups.length === 0) return;

  const done = new Set(["shipped", "delivered"]);
  const cancelled = new Set(["cancelled"]);
  const live = groups.filter((g) => !cancelled.has(g.canonical_status));

  let status: "unfulfilled" | "partial" | "fulfilled" | "cancelled";
  if (live.length === 0) status = "cancelled";
  else if (live.every((g) => done.has(g.canonical_status))) status = "fulfilled";
  else if (live.some((g) => done.has(g.canonical_status))) status = "partial";
  else status = "unfulfilled";

  await db
    .from("orders")
    .update({ fulfillment_status: status })
    .eq("id", orderId);
}

/**
 * Retry a failed provider submission (Master Spec §10.5.6).
 *
 * Reuses the group's EXISTING submission key, so a repeated click cannot create
 * a second provider order. Refuses outright on non-retryable failures rather
 * than letting the owner burn attempts on something that cannot succeed.
 */
export async function retrySubmissionAction(input: {
  issueId: string;
  fulfillmentGroupId: string;
}): Promise<FulfillmentResult> {
  const auth = await owner();
  if (!auth.ok) return auth;

  const db = createAdminClient();

  const { data: issue, error: issueError } = await db
    .from("fulfillment_issues")
    .select("id, retryable, resolved_at, issue_code")
    .eq("id", input.issueId)
    .maybeSingle();

  if (issueError) return { ok: false, message: issueError.message };
  if (!issue) return { ok: false, message: "That issue no longer exists." };
  if (issue.resolved_at) return { ok: false, message: "That issue is already resolved." };
  if (!issue.retryable) {
    return {
      ok: false,
      message: "This failure is not retryable. Choose another recovery action.",
    };
  }

  const { data: group, error: groupError } = await db
    .from("fulfillment_groups")
    .select("id, submission_key")
    .eq("id", input.fulfillmentGroupId)
    .maybeSingle();

  if (groupError) return { ok: false, message: groupError.message };
  if (!group) return { ok: false, message: "That fulfillment group no longer exists." };

  const { count } = await db
    .from("fulfillment_recovery_attempts")
    .select("id", { count: "exact", head: true })
    .eq("issue_id", input.issueId);

  const { error: attemptError } = await db
    .from("fulfillment_recovery_attempts")
    .insert({
      issue_id: input.issueId,
      fulfillment_group_id: input.fulfillmentGroupId,
      operation: "retry_submission",
      attempt_number: (count ?? 0) + 1,
      // The SAME key as the original submission. This is what makes retry
      // idempotent at the provider.
      submission_key: group.submission_key,
      result: "started",
      actor_user_id: auth.userId,
    });

  if (attemptError) return { ok: false, message: attemptError.message };

  await db
    .from("fulfillment_issues")
    .update({ last_attempt_at: new Date().toISOString() })
    .eq("id", input.issueId);

  await audit("fulfillment.retry_started", input.fulfillmentGroupId, auth.userId, {
    issue_id: input.issueId,
    submission_key: group.submission_key,
  });

  revalidatePath("/studio/fulfillment/action-required");
  return { ok: true };
}

/**
 * Route a failed group to manual fulfillment (Master Spec §10.5.6).
 *
 * Changes the EXECUTION route while preserving the same order items and
 * fulfillment obligations. The override is recorded with its reason and actor.
 */
export async function fulfillManuallyAction(input: {
  issueId: string;
  fulfillmentGroupId: string;
  reason: string;
}): Promise<FulfillmentResult> {
  const auth = await owner();
  if (!auth.ok) return auth;

  if (!input.reason.trim()) {
    return { ok: false, message: "Record why this is moving to manual fulfillment." };
  }

  const db = createAdminClient();

  const { data: group, error: groupError } = await db
    .from("fulfillment_groups")
    .select("id, provider_id")
    .eq("id", input.fulfillmentGroupId)
    .maybeSingle();

  if (groupError) return { ok: false, message: groupError.message };
  if (!group) return { ok: false, message: "That fulfillment group no longer exists." };

  const { error: overrideError } = await db
    .from("fulfillment_routing_overrides")
    .insert({
      fulfillment_group_id: input.fulfillmentGroupId,
      original_provider_id: group.provider_id,
      manual_mode: true,
      reason: input.reason.trim(),
      created_by: auth.userId,
    });

  if (overrideError) return { ok: false, message: overrideError.message };

  await db
    .from("fulfillment_groups")
    .update({ routing_mode: "manual", canonical_status: "pending_submission" })
    .eq("id", input.fulfillmentGroupId);

  const resolved = await resolveIssue(
    input.issueId,
    "fulfill_manually",
    auth.userId,
  );
  if (!resolved.ok) return resolved;

  await audit("fulfillment.routed_manual", input.fulfillmentGroupId, auth.userId, {
    issue_id: input.issueId,
    reason: input.reason.trim(),
  });

  revalidatePath("/studio/fulfillment/action-required");
  revalidatePath("/studio/fulfillment/supplier-orders");
  return { ok: true };
}

/**
 * Mark an issue resolved.
 *
 * Resolution never deletes the original failure event — resolved issues stay in
 * history (Master Spec §10.5.7).
 */
export async function resolveIssueAction(input: {
  issueId: string;
  resolutionType: string;
}): Promise<FulfillmentResult> {
  const auth = await owner();
  if (!auth.ok) return auth;
  return resolveIssue(input.issueId, input.resolutionType, auth.userId);
}

async function resolveIssue(
  issueId: string,
  resolutionType: string,
  actorUserId: string,
): Promise<FulfillmentResult> {
  const db = createAdminClient();
  const { error } = await db
    .from("fulfillment_issues")
    .update({
      resolved_at: new Date().toISOString(),
      resolution_type: resolutionType,
      resolved_by: actorUserId,
    })
    .eq("id", issueId)
    // Only resolve an issue that is still open, so a double click cannot
    // rewrite an earlier resolution.
    .is("resolved_at", null);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/studio/fulfillment/action-required");
  return { ok: true };
}

const modeSchema = z.object({
  variantId: z.uuid(),
  productId: z.uuid(),
  inventoryMode: z.enum([
    "stocked",
    "supplier_stocked",
    "made_to_order",
    "manual_supplier",
    "untracked",
  ]),
});

/**
 * Change a variant's inventory mode (Master Spec §10.4.10, §10.4.20).
 *
 * Switching mode changes how the item is sold and fulfilled, so incompatible
 * settings are reconciled here rather than left in a contradictory state:
 * leaving a supplier-stocked variant with `track_inventory` on would show a
 * local quantity that BAD ERA does not actually hold.
 */
export async function setInventoryModeAction(
  input: unknown,
): Promise<FulfillmentResult> {
  const auth = await owner();
  if (!auth.ok) return auth;

  const parsed = modeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid mode" };
  }

  const { variantId, productId, inventoryMode } = parsed.data;
  const db = createAdminClient();

  // Only STOCKED tracks a local quantity. UNTRACKED tracks nothing at all.
  const tracksLocally = inventoryMode === "stocked";

  const { error } = await db
    .from("product_variants")
    .update({
      inventory_mode: inventoryMode,
      track_inventory: tracksLocally,
    })
    .eq("id", variantId);

  if (error) return { ok: false, message: error.message };

  await audit("product.inventory_mode_changed", variantId, auth.userId, {
    product_id: productId,
    inventory_mode: inventoryMode,
  });

  revalidatePath(`/studio/products/${productId}/fulfillment`);
  revalidatePath("/studio/inventory");
  return { ok: true };
}

const mappingSchema = z.object({
  variantId: z.uuid(),
  productId: z.uuid(),
  providerId: z.uuid(),
  supplierSku: z.string().max(120).nullable(),
  supplierCostCents: z.number().int().min(0).nullable(),
  stockBuffer: z.number().int().min(0),
});

/**
 * Map a variant to a provider.
 *
 * Auto-submit is deliberately NOT settable here. It is off for every new
 * mapping and can only be enabled once the provider reaches LIVE_AUTOMATED and
 * every sellable variant is mapped (Master Spec §10.4.13).
 */
export async function saveVariantMappingAction(
  input: unknown,
): Promise<FulfillmentResult> {
  const auth = await owner();
  if (!auth.ok) return auth;

  const parsed = mappingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid mapping" };
  }

  const { variantId, productId, providerId, supplierSku, supplierCostCents, stockBuffer } =
    parsed.data;
  const db = createAdminClient();

  const { error } = await db.from("provider_variant_mappings").upsert(
    {
      variant_id: variantId,
      provider_id: providerId,
      supplier_sku: supplierSku?.trim() || null,
      supplier_cost_cents: supplierCostCents,
      stock_buffer: stockBuffer,
      // Off by default and never raised from this form.
      auto_submit: false,
      active: true,
    },
    { onConflict: "variant_id,provider_id" },
  );

  if (error) return { ok: false, message: error.message };

  // The variant's own provider pointer follows the active mapping.
  await db
    .from("product_variants")
    .update({ fulfillment_provider_id: providerId })
    .eq("id", variantId);

  await audit("product.provider_mapped", variantId, auth.userId, {
    product_id: productId,
    provider_id: providerId,
    supplier_sku: supplierSku,
  });

  revalidatePath(`/studio/products/${productId}/fulfillment`);
  return { ok: true };
}

/**
 * Enable or disable automatic submission for a mapping.
 *
 * Enabling requires the provider to be LIVE_AUTOMATED. Blocking it here — with
 * the specific reason — is what stops auto-submit being switched on for a
 * provider that has not passed its validation gates (Master Spec §10.4.13).
 */
export async function setAutoSubmitAction(input: {
  mappingId: string;
  productId: string;
  enabled: boolean;
}): Promise<FulfillmentResult> {
  const auth = await owner();
  if (!auth.ok) return auth;

  const db = createAdminClient();

  const { data: mapping, error: readError } = await db
    .from("provider_variant_mappings")
    .select("id, provider_id, fulfillment_providers(name, lifecycle_status, connection_mode)")
    .eq("id", input.mappingId)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };
  if (!mapping) return { ok: false, message: "That mapping no longer exists." };

  const provider = mapping.fulfillment_providers as unknown as {
    name: string;
    lifecycle_status: string;
    connection_mode: string;
  } | null;

  if (input.enabled) {
    if (provider?.connection_mode !== "api") {
      return {
        ok: false,
        message: `${provider?.name ?? "This provider"} has no API to submit to. Auto-submit only applies to API providers.`,
      };
    }
    if (provider.lifecycle_status !== "live_automated") {
      return {
        ok: false,
        message: `${provider.name} is "${provider.lifecycle_status.replace(/_/g, " ")}". Auto-submit requires the provider to reach live automated first.`,
      };
    }
  }

  const { error } = await db
    .from("provider_variant_mappings")
    .update({ auto_submit: input.enabled })
    .eq("id", input.mappingId);

  if (error) return { ok: false, message: error.message };

  await audit("product.auto_submit_changed", input.mappingId, auth.userId, {
    product_id: input.productId,
    enabled: input.enabled,
  });

  revalidatePath(`/studio/products/${input.productId}/fulfillment`);
  return { ok: true };
}

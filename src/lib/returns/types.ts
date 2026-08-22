import type { Enums } from "@/lib/db/generated.types";

/**
 * Returns and refunds (Master Spec §9.1, §10.3.7).
 *
 * THE invariant of this phase: REFUND IS NOT RESTOCK.
 *
 * Approving a return does not refund it. Refunding does not put the unit back
 * on the shelf. Restock is an explicit, per-item decision the owner makes AFTER
 * inspecting what actually came back — a damaged item must never silently
 * become sellable stock again.
 *
 * The schema enforces the separation: `returns.status` tracks the return,
 * `refunds` tracks money, and `return_items.restocked_at` tracks inventory.
 * Three lifecycles, deliberately not one.
 */

export type ReturnSummary = {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  status: Enums<"return_status">;
  reason: string;
  requestedAt: string;
  approvedAt: string | null;
  receivedAt: string | null;
  itemCount: number;
};

export type ReturnItemDetail = {
  id: string;
  orderItemId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  quantity: number;
  unitPriceCents: number;
  condition: Enums<"return_item_condition">;
  disposition: Enums<"return_disposition">;
  restockedAt: string | null;
  notes: string | null;
};

export type ReturnDetail = ReturnSummary & {
  customerNote: string | null;
  currency: string;
  orderTotalCents: number;
  orderPaidAt: string | null;
  items: ReturnItemDetail[];
  refunds: {
    id: string;
    amountCents: number;
    currency: string;
    status: Enums<"refund_status">;
    stripeRefundId: string | null;
    reason: string | null;
    createdAt: string;
    succeededAt: string | null;
  }[];
  /** Sum of succeeded refunds against the order. */
  refundedCents: number;
};

/** Order lines a customer may still return. */
export type ReturnableLine = {
  orderItemId: string;
  productTitle: string;
  variantTitle: string;
  options: Record<string, string>;
  quantity: number;
  alreadyRequested: number;
  returnableQuantity: number;
  unitPriceCents: number;
  currency: string;
};

export const RETURN_STATUS_LABEL: Record<Enums<"return_status">, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  in_transit: "On its way back",
  received: "Received",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const CONDITION_LABEL: Record<Enums<"return_item_condition">, string> = {
  unopened: "Unopened",
  resellable: "Resellable",
  damaged: "Damaged",
  unknown: "Not yet inspected",
};

export const DISPOSITION_LABEL: Record<Enums<"return_disposition">, string> = {
  restock: "Put back into stock",
  damaged: "Damaged — do not restock",
  nonrestockable: "Cannot be resold",
  manual_review: "Needs a decision",
};

/** Reasons a customer can choose. Free text goes in the note. */
export const RETURN_REASONS = [
  "Wrong size",
  "Not as expected",
  "Arrived damaged",
  "Wrong item sent",
  "Changed my mind",
  "Other",
] as const;

/**
 * Return eligibility (Master Spec §9.1).
 *
 * Policy-driven and configurable rather than hard-coded, because the window is
 * a business decision the owner may change without a deploy. The default here
 * applies only until a value is configured in Studio settings.
 */
export const DEFAULT_RETURN_WINDOW_DAYS = 30;

export type EligibilityResult =
  | { eligible: true; daysRemaining: number }
  | { eligible: false; reason: string };

export function checkReturnEligibility(input: {
  paidAt: string | null;
  fulfillmentStatus: string;
  windowDays: number;
  now?: Date;
}): EligibilityResult {
  if (!input.paidAt) {
    return { eligible: false, reason: "This order has not been paid yet." };
  }

  // Nothing has shipped, so there is nothing to send back. Cancelling is the
  // right path, not a return.
  if (input.fulfillmentStatus === "unfulfilled") {
    return {
      eligible: false,
      reason: "This order has not shipped yet. Contact support to change or cancel it.",
    };
  }

  if (input.fulfillmentStatus === "cancelled") {
    return { eligible: false, reason: "This order was cancelled." };
  }

  const now = input.now ?? new Date();
  const paid = new Date(input.paidAt);
  const elapsedDays = Math.floor(
    (now.getTime() - paid.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysRemaining = input.windowDays - elapsedDays;

  if (daysRemaining <= 0) {
    return {
      eligible: false,
      reason: `The ${input.windowDays}-day return window has closed.`,
    };
  }

  return { eligible: true, daysRemaining };
}

/**
 * Which return transitions are allowed from here.
 *
 * Approval and refund are deliberately separate: approving says "send it
 * back", not "here is your money". Receipt and inspection come first
 * (Master Spec §9.1).
 */
export function allowedReturnTransitions(
  status: Enums<"return_status">,
): Enums<"return_status">[] {
  switch (status) {
    case "requested":
      return ["approved", "rejected", "cancelled"];
    case "approved":
      return ["in_transit", "received", "cancelled"];
    case "in_transit":
      return ["received", "closed"];
    case "received":
      return ["closed"];
    default:
      // rejected, closed and cancelled are terminal.
      return [];
  }
}

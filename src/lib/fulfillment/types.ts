import type { Enums } from "@/lib/db/generated.types";

/**
 * Client-safe fulfillment shapes.
 *
 * Separate from the server query modules so Client Components can import them
 * without dragging in the service-role client.
 *
 * NOTE ON COST: supplier cost appears in these Studio-only shapes. It must
 * never be passed into a storefront component (Master Spec §10.4.14).
 */

export type ProviderCard = {
  id: string;
  providerKey: string;
  name: string;
  providerType: Enums<"provider_type">;
  connectionMode: Enums<"provider_connection_mode">;
  lifecycleStatus: Enums<"provider_lifecycle_status">;
  healthStatus: Enums<"provider_health_status">;
  orderingUrl: string | null;
  /** Mapped catalog reach. */
  mappedVariantCount: number;
  mappedProductCount: number;
  openFulfillments: number;
  actionRequiredCount: number;
  /**
   * Last successful provider event. Null for internal and manual providers,
   * which have no sync to report — showing a timestamp there would be fiction
   * (Master Spec §10.4.3).
   */
  lastSyncedAt: string | null;
};

/**
 * The owner-facing badge on a provider card (Master Spec §10.4.4).
 *
 * Derived from lifecycle + health + open issues rather than stored, so it can
 * never drift from the underlying state.
 */
export type ProviderBadge =
  | "CONNECTED"
  | "MANUAL"
  | "INTERNAL"
  | "DEGRADED"
  | "ACTION REQUIRED"
  | "DISABLED"
  | "DRAFT";

export function providerBadge(card: {
  connectionMode: Enums<"provider_connection_mode">;
  lifecycleStatus: Enums<"provider_lifecycle_status">;
  healthStatus: Enums<"provider_health_status">;
  actionRequiredCount: number;
}): ProviderBadge {
  // Unresolved work that blocks a paid order outranks every other signal.
  if (card.actionRequiredCount > 0) return "ACTION REQUIRED";
  if (card.lifecycleStatus === "disabled") return "DISABLED";
  if (card.healthStatus === "degraded" || card.healthStatus === "error") {
    return "DEGRADED";
  }
  if (card.lifecycleStatus === "draft" || card.lifecycleStatus === "sample_testing") {
    return "DRAFT";
  }
  if (card.connectionMode === "internal") return "INTERNAL";
  if (card.connectionMode === "manual") return "MANUAL";
  return "CONNECTED";
}

export type SupplierTaskRow = {
  taskId: string;
  fulfillmentGroupId: string;
  status: Enums<"supplier_task_status">;
  orderId: string;
  orderNumber: string;
  orderPaidAt: string | null;
  customerEmail: string;
  providerId: string;
  providerName: string;
  orderingUrl: string | null;
  supplierReference: string | null;
  /** Studio-only. Never rendered on the storefront. */
  expectedCostCents: number | null;
  currency: string;
  submittedAt: string | null;
  items: {
    variantTitle: string;
    productTitle: string;
    supplierSku: string | null;
    quantity: number;
  }[];
  shippingAddress: Record<string, unknown>;
};

export type ReadyToShipRow = {
  fulfillmentGroupId: string;
  orderId: string;
  orderNumber: string;
  orderPaidAt: string | null;
  customerEmail: string;
  locationName: string | null;
  canonicalStatus: Enums<"fulfillment_group_status">;
  items: { productTitle: string; variantTitle: string; sku: string | null; quantity: number }[];
  shippingAddress: Record<string, unknown>;
};

export type IssueRow = {
  issueId: string;
  fulfillmentGroupId: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  providerName: string;
  issueCode: string;
  severity: Enums<"issue_severity">;
  retryable: boolean;
  ownerSummary: string;
  openedAt: string;
  lastAttemptAt: string | null;
  attemptCount: number;
  paymentStatus: string;
  resolvedAt: string | null;
  resolutionType: string | null;
};

export type ShipmentRow = {
  id: string;
  fulfillmentGroupId: string;
  orderId: string;
  orderNumber: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: Enums<"shipment_status">;
  shippedAt: string | null;
  deliveredAt: string | null;
};

/** Canonical issue codes and their owner-facing wording (Master Spec §10.5.5). */
export const ISSUE_LABEL: Record<string, string> = {
  SUBMISSION_FAILED: "Submission failed",
  PROVIDER_REJECTED: "Provider rejected the order",
  SUPPLIER_OUT_OF_STOCK: "Supplier is out of stock",
  VARIANT_MAPPING_ERROR: "Variant mapping error",
  PROVIDER_AUTH_ERROR: "Provider authorization failed",
  INVALID_FULFILLMENT_ADDRESS: "Address rejected by provider",
  QUOTE_ERROR: "Could not get a supplier quote",
  RATE_ERROR: "Could not get a shipping rate",
  TRACKING_ERROR: "Tracking could not be retrieved",
  PROVIDER_TIMEOUT: "Provider timed out",
  UNKNOWN_PROVIDER_ERROR: "Unclassified provider error",
};

/**
 * Which recovery actions are offered for an issue (Master Spec §10.5.4).
 *
 * Actions are CONTEXTUAL. Retry is never offered for a non-retryable rejection,
 * because clicking it could only ever fail again — and offering it implies the
 * problem might resolve itself, which is misleading when it cannot.
 */
export type RecoveryAction =
  | "retry"
  | "fulfill_manually"
  | "contact_supplier"
  | "update_mapping"
  | "correct_address"
  | "cancel_refund";

export function availableRecoveryActions(issue: {
  issueCode: string;
  retryable: boolean;
}): RecoveryAction[] {
  const actions: RecoveryAction[] = [];

  if (issue.retryable) actions.push("retry");

  switch (issue.issueCode) {
    case "SUPPLIER_OUT_OF_STOCK":
      // Retrying cannot conjure stock. The owner needs an alternative route or
      // a refund conversation with the customer.
      return ["fulfill_manually", "contact_supplier", "cancel_refund"];

    case "VARIANT_MAPPING_ERROR":
      actions.push("update_mapping", "fulfill_manually");
      break;

    case "PROVIDER_AUTH_ERROR":
      // Credentials must be repaired before a retry can succeed.
      return ["contact_supplier", "fulfill_manually"];

    case "INVALID_FULFILLMENT_ADDRESS":
      actions.push("correct_address", "fulfill_manually");
      break;

    case "PROVIDER_REJECTED":
      actions.push("contact_supplier", "fulfill_manually", "cancel_refund");
      break;

    default:
      actions.push("fulfill_manually", "contact_supplier");
  }

  return [...new Set(actions)];
}

export const RECOVERY_LABEL: Record<RecoveryAction, string> = {
  retry: "Retry submission",
  fulfill_manually: "Fulfill manually",
  contact_supplier: "Contact supplier",
  update_mapping: "Update mapping",
  correct_address: "Correct address",
  cancel_refund: "Cancel / refund",
};

/** Provider lifecycle stages, owner-facing (Master Spec §10.4). */
export const LIFECYCLE_LABEL: Record<Enums<"provider_lifecycle_status">, string> = {
  draft: "Draft",
  sample_testing: "Sample testing",
  test: "Sandbox / test",
  live_manual: "Live — manual",
  live_automated: "Live — automated",
  disabled: "Disabled",
};

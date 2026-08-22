import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  availableRecoveryActions,
  providerBadge,
} from "@/lib/fulfillment/types";
import { fieldsForMode } from "@/lib/fulfillment/product-fulfillment-types";

/**
 * The fulfillment rules that protect a paid customer are behavioural, not
 * cosmetic. These lock them in.
 */

describe("recovery actions are contextual", () => {
  it("never offers retry for a supplier out-of-stock", () => {
    // Retrying cannot conjure stock. Offering it implies the problem might
    // resolve itself (Master Spec §10.5.4).
    const actions = availableRecoveryActions({
      issueCode: "SUPPLIER_OUT_OF_STOCK",
      retryable: true,
    });
    expect(actions).not.toContain("retry");
    expect(actions).toContain("cancel_refund");
  });

  it("never offers retry when credentials are broken", () => {
    const actions = availableRecoveryActions({
      issueCode: "PROVIDER_AUTH_ERROR",
      retryable: true,
    });
    expect(actions).not.toContain("retry");
  });

  it("offers retry for a transient submission failure", () => {
    const actions = availableRecoveryActions({
      issueCode: "SUBMISSION_FAILED",
      retryable: true,
    });
    expect(actions).toContain("retry");
  });

  it("never offers retry when the issue is not retryable", () => {
    const actions = availableRecoveryActions({
      issueCode: "SUBMISSION_FAILED",
      retryable: false,
    });
    expect(actions).not.toContain("retry");
  });

  it("always leaves at least one way forward", () => {
    const codes = [
      "SUBMISSION_FAILED",
      "PROVIDER_REJECTED",
      "SUPPLIER_OUT_OF_STOCK",
      "VARIANT_MAPPING_ERROR",
      "PROVIDER_AUTH_ERROR",
      "INVALID_FULFILLMENT_ADDRESS",
      "UNKNOWN_PROVIDER_ERROR",
    ];
    for (const issueCode of codes) {
      const actions = availableRecoveryActions({ issueCode, retryable: false });
      expect(actions.length, `${issueCode} left the owner stuck`).toBeGreaterThan(0);
    }
  });
});

describe("provider badge", () => {
  const base = {
    connectionMode: "api" as const,
    lifecycleStatus: "live_automated" as const,
    healthStatus: "connected" as const,
    actionRequiredCount: 0,
  };

  it("puts action required above every other signal", () => {
    expect(providerBadge({ ...base, actionRequiredCount: 2 })).toBe("ACTION REQUIRED");
  });

  it("labels a manual supplier as manual, not connected", () => {
    expect(
      providerBadge({ ...base, connectionMode: "manual", healthStatus: "manual" }),
    ).toBe("MANUAL");
  });

  it("labels internal stock as internal", () => {
    expect(
      providerBadge({ ...base, connectionMode: "internal", healthStatus: "connected" }),
    ).toBe("INTERNAL");
  });
});

describe("mode-conditional fields", () => {
  it("shows local quantity only when BAD ERA stocks the item", () => {
    expect(fieldsForMode("stocked").quantity).toBe(true);
    for (const mode of ["supplier_stocked", "made_to_order", "manual_supplier", "untracked"] as const) {
      expect(fieldsForMode(mode).quantity, `${mode} must not show local quantity`).toBe(false);
    }
  });

  it("never offers auto-submit for a manual supplier", () => {
    // A manual supplier has no API to submit to; the control would be fiction.
    expect(fieldsForMode("manual_supplier").autoSubmit).toBe(false);
  });

  it("hides every quantity and provider control when untracked", () => {
    const fields = fieldsForMode("untracked");
    expect(fields.quantity).toBe(false);
    expect(fields.provider).toBe(false);
    expect(fields.autoSubmit).toBe(false);
  });
});

describe("paid-order safety in the mutation layer", () => {
  const raw = readFileSync("src/lib/fulfillment/actions.ts", "utf8");
  // Strip comments: the module documents these rules in prose, naming the very
  // things it must not do, which would otherwise read as violations.
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

  it("reuses the existing submission key on retry", () => {
    // A fresh key per retry would let repeated clicks create duplicate
    // provider orders (Master Spec §10.5.6).
    expect(source).toContain("submission_key: group.submission_key");
  });

  it("refuses to retry a non-retryable failure", () => {
    expect(source).toContain("if (!issue.retryable)");
  });

  it("requires a supplier reference before marking submitted", () => {
    expect(source).toContain('supplierReference: z.string().trim().min(1');
  });

  it("never marks an order shipped from the supplier submission path", () => {
    const markSubmitted = source.slice(
      source.indexOf("markSupplierOrderSubmittedAction"),
      source.indexOf("const trackingSchema"),
    );
    // SUBMITTED is not SHIPPED (Master Spec §10.5.3).
    expect(markSubmitted).not.toContain('"shipped"');
    expect(markSubmitted).not.toContain("shipments");
  });

  it("has no action for opening a supplier portal", () => {
    // Opening a portal changes no state, so no mutation may exist for it.
    expect(source).not.toContain("openPortal");
  });
});

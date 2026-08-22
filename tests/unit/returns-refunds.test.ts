import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  allowedReturnTransitions,
  checkReturnEligibility,
} from "@/lib/returns/types";

/**
 * Phase 7's headline invariant: REFUND IS NOT RESTOCK, and APPROVAL IS NOT
 * REFUND. Three lifecycles that must never trigger one another.
 */

function code(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

describe("return eligibility", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("refuses a return on an unpaid order", () => {
    const result = checkReturnEligibility({
      paidAt: null,
      fulfillmentStatus: "unfulfilled",
      windowDays: 30,
      now,
    });
    expect(result.eligible).toBe(false);
  });

  it("refuses a return before anything has shipped", () => {
    // Nothing to send back yet — cancelling is the right path.
    const result = checkReturnEligibility({
      paidAt: "2026-06-14T12:00:00Z",
      fulfillmentStatus: "unfulfilled",
      windowDays: 30,
      now,
    });
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.reason).toMatch(/has not shipped/i);
  });

  it("allows a return inside the window", () => {
    const result = checkReturnEligibility({
      paidAt: "2026-06-01T12:00:00Z",
      fulfillmentStatus: "fulfilled",
      windowDays: 30,
      now,
    });
    expect(result.eligible).toBe(true);
    if (result.eligible) expect(result.daysRemaining).toBe(16);
  });

  it("refuses once the window has closed", () => {
    const result = checkReturnEligibility({
      paidAt: "2026-04-01T12:00:00Z",
      fulfillmentStatus: "fulfilled",
      windowDays: 30,
      now,
    });
    expect(result.eligible).toBe(false);
  });

  it("treats the window as configurable, not fixed", () => {
    const long = checkReturnEligibility({
      paidAt: "2026-04-01T12:00:00Z",
      fulfillmentStatus: "fulfilled",
      windowDays: 120,
      now,
    });
    expect(long.eligible).toBe(true);
  });
});

describe("return transitions", () => {
  it("cannot skip from requested straight to closed", () => {
    // Inspection must happen before a return is finished.
    expect(allowedReturnTransitions("requested")).not.toContain("closed");
  });

  it("treats rejected, closed and cancelled as terminal", () => {
    for (const status of ["rejected", "closed", "cancelled"] as const) {
      expect(allowedReturnTransitions(status)).toEqual([]);
    }
  });

  it("allows approval or rejection from requested", () => {
    const next = allowedReturnTransitions("requested");
    expect(next).toContain("approved");
    expect(next).toContain("rejected");
  });
});

describe("refund is not restock", () => {
  const returns = code("src/lib/returns/actions.ts");
  const refunds = code("src/lib/refunds/actions.ts");

  it("the refund path never adjusts inventory", () => {
    // Refunding money must not put a unit back on the shelf.
    expect(refunds).not.toContain("studio_adjust_inventory");
    expect(refunds).not.toContain("inventory_levels");
    expect(refunds).not.toContain("restock");
  });

  it("the approval path never refunds", () => {
    const transition = returns.slice(
      returns.indexOf("export async function transitionReturnAction"),
      returns.indexOf("const inspectSchema"),
    );
    expect(transition).not.toContain("refund");
    expect(transition).not.toContain("stripe");
  });

  it("restock is its own action, gated on receipt and disposition", () => {
    const restock = returns.slice(
      returns.indexOf("export async function restockReturnItemAction"),
    );
    expect(restock).toContain("studio_adjust_inventory");
    expect(restock).toContain('p_reason: "return_restock"');
    // Cannot restock before the goods are actually back.
    expect(restock).toContain('ret.status !== "received"');
    // Cannot restock unless inspection said so.
    expect(restock).toContain('item.disposition !== "restock"');
    // Cannot restock the same item twice.
    expect(restock).toContain("item.restocked_at");
  });

  it("refuses to restock a damaged item", () => {
    expect(returns).toContain('condition === "damaged" && disposition === "restock"');
  });
});

describe("refund safety", () => {
  const refunds = code("src/lib/refunds/actions.ts");

  it("records the refund locally before calling Stripe", () => {
    // A crash mid-call must leave a pending row to reconcile, not an
    // invisible refund.
    const insertIndex = refunds.indexOf('.from("refunds")');
    const stripeIndex = refunds.indexOf("stripe.refunds.create");
    expect(insertIndex).toBeGreaterThan(-1);
    expect(insertIndex).toBeLessThan(stripeIndex);
  });

  it("sends a Stripe idempotency key", () => {
    expect(refunds).toContain("idempotencyKey");
  });

  it("counts pending refunds against the refundable limit", () => {
    // Otherwise two concurrent refunds could together exceed what was captured.
    expect(refunds).toContain('r.status === "succeeded" || r.status === "pending"');
  });

  it("marks the local record failed when Stripe refuses", () => {
    expect(refunds).toContain('status: "failed"');
  });
});

describe("support keeps notes private", () => {
  const queries = code("src/lib/support/queries.ts");

  it("the customer case list never reads the notes table", () => {
    const customerFn = queries.slice(
      queries.indexOf("export async function listCustomerSupportCases"),
    );
    expect(customerFn).not.toContain("support_notes");
  });

  it("internal notes are a separate table from messages", () => {
    const actions = code("src/lib/support/actions.ts");
    const noteFn = actions.slice(
      actions.indexOf("export async function addCaseNoteAction"),
      actions.indexOf("export async function setCaseStatusAction"),
    );
    expect(noteFn).toContain("support_notes");
    // A note has no visibility flag that could be misconfigured.
    expect(noteFn).not.toContain("customer_visible");
  });
});

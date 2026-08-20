import { describe, expect, it } from "vitest";
import type Stripe from "stripe";

import {
  handleStripeCheckoutEvent,
  type CommerceRpc,
} from "@/lib/checkout/stripe-event-handler";

/**
 * Locks the Stripe -> commerce routing contract (Kickoff v0.2 §5).
 *
 * These are unit tests over the orchestration only: the CommerceRpc boundary is
 * faked. The database-level guarantees (atomicity, row locking, real
 * idempotency) are covered by the SQL acceptance tests, which need a live
 * PostgreSQL instance.
 */

type Call = { fn: string; args: unknown[] };

function makeRpc(overrides: Partial<CommerceRpc> = {}) {
  const calls: Call[] = [];
  const record =
    <T>(fn: string, result: T) =>
    async (...args: unknown[]) => {
      calls.push({ fn, args });
      return result;
    };

  const rpc: CommerceRpc = {
    claimStripeEvent: record("claimStripeEvent", true),
    finishStripeEvent: record("finishStripeEvent", undefined),
    checkoutIdFromStripeSession: record("checkoutIdFromStripeSession", "checkout-1"),
    convertPaidCheckout: record("convertPaidCheckout", "order-1"),
    markCheckoutPaymentPending: record("markCheckoutPaymentPending", undefined),
    releaseCheckoutInventory: record("releaseCheckoutInventory", undefined),
    ...overrides,
  };

  return { rpc, calls, names: () => calls.map((c) => c.fn) };
}

function event(
  type: string,
  session: Partial<Stripe.Checkout.Session> = {},
): Stripe.Event {
  return {
    id: `evt_${Math.random().toString(16).slice(2)}`,
    type,
    data: {
      object: { id: "cs_test_1", payment_status: "paid", ...session },
    },
  } as unknown as Stripe.Event;
}

describe("handleStripeCheckoutEvent", () => {
  it("converts a paid checkout.session.completed into an order", async () => {
    const { rpc, names } = makeRpc();
    await handleStripeCheckoutEvent(event("checkout.session.completed"), rpc);

    expect(names()).toContain("convertPaidCheckout");
    expect(names()).not.toContain("releaseCheckoutInventory");
  });

  it("holds stock reserved when a delayed payment is still unpaid", async () => {
    // Acceptance case 4: unpaid delayed method must move the reservation to
    // payment_pending, NOT release it.
    const { rpc, names } = makeRpc();
    await handleStripeCheckoutEvent(
      event("checkout.session.completed", { payment_status: "unpaid" }),
      rpc,
    );

    expect(names()).toContain("markCheckoutPaymentPending");
    expect(names()).not.toContain("releaseCheckoutInventory");
    expect(names()).not.toContain("convertPaidCheckout");
  });

  it("treats no_payment_required as paid", async () => {
    const { rpc, names } = makeRpc();
    await handleStripeCheckoutEvent(
      event("checkout.session.completed", {
        payment_status: "no_payment_required",
      }),
      rpc,
    );

    expect(names()).toContain("convertPaidCheckout");
  });

  it("converts on async_payment_succeeded", async () => {
    const { rpc, names } = makeRpc();
    await handleStripeCheckoutEvent(event("checkout.session.async_payment_succeeded"), rpc);
    expect(names()).toContain("convertPaidCheckout");
  });

  it("releases the reservation on async_payment_failed", async () => {
    // Acceptance case 6.
    const { rpc, calls } = makeRpc();
    await handleStripeCheckoutEvent(event("checkout.session.async_payment_failed"), rpc);

    const release = calls.find((c) => c.fn === "releaseCheckoutInventory");
    expect(release).toBeDefined();
    expect(release?.args[1]).toBe("payment_failed");
  });

  it("releases the reservation on checkout.session.expired", async () => {
    // Acceptance case 3.
    const { rpc, calls } = makeRpc();
    await handleStripeCheckoutEvent(event("checkout.session.expired"), rpc);

    const release = calls.find((c) => c.fn === "releaseCheckoutInventory");
    expect(release).toBeDefined();
    expect(release?.args[1]).toBe("expired");
  });

  it("performs no commerce action when the event was already claimed", async () => {
    // Acceptance case 7: duplicate delivery must be a no-op. The override
    // below deliberately bypasses the call recorder, so assert on the absence
    // of every downstream effect rather than on the recorded call list.
    const { rpc, names } = makeRpc({
      claimStripeEvent: async () => false,
    });
    await handleStripeCheckoutEvent(event("checkout.session.completed"), rpc);

    expect(names()).toEqual([]);
  });

  it("ignores unrelated event types without touching inventory", async () => {
    const { rpc, calls, names } = makeRpc();
    await handleStripeCheckoutEvent(event("payment_intent.succeeded"), rpc);

    expect(names()).not.toContain("convertPaidCheckout");
    expect(names()).not.toContain("releaseCheckoutInventory");
    const finish = calls.find((c) => c.fn === "finishStripeEvent");
    expect(finish?.args[1]).toBe("ignored");
  });

  it("marks the event failed and rethrows when the session is unknown", async () => {
    const { rpc, calls } = makeRpc({
      checkoutIdFromStripeSession: async () => null,
    });

    await expect(
      handleStripeCheckoutEvent(event("checkout.session.completed"), rpc),
    ).rejects.toThrow(/Unknown Stripe Checkout Session/);

    const finish = calls.find((c) => c.fn === "finishStripeEvent");
    expect(finish?.args[1]).toBe("failed");
  });
});

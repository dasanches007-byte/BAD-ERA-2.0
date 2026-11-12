import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

import { handleStripeCheckoutEvent, type CommerceRpc } from "@/lib/checkout/stripe-event-handler";
import { confirmEmailMessage, resetPasswordMessage } from "@/lib/email/account-emails";
import { EMAIL_COLORS } from "@/lib/email/layout";
import {
  DEFAULT_ORDER_EMAIL_WORDS,
  EXAMPLE_ORDER,
  fillPlaceholders,
  renderOrderConfirmationEmail,
} from "@/lib/email/order-confirmation";
import { orderAddressLines, readOrderAddress } from "@/lib/orders/address";
import { parseMoneyToCents, shippingCentsFor } from "@/lib/settings/shipping";

/**
 * What a sale needs that only the owner can give (a shipping price, the
 * order email), customer accounts, and the two defects found while building
 * them: Stripe retries that were swallowed, and an address nobody could read.
 */

const code = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

// --- A fake Supabase client: records each query, answers from a handler. ----

type Query = { table: string; calls: { method: string; args: unknown[] }[] };
type Answer = { data?: unknown; error?: unknown; count?: number | null };

function fakeDb(answer: (query: Query) => Answer) {
  const queries: Query[] = [];
  const db = {
    from(table: string) {
      const query: Query = { table, calls: [] };
      queries.push(query);
      const chain: Record<string, unknown> = {};
      for (const method of [
        "select", "insert", "update", "upsert", "delete", "eq", "neq", "or", "is", "in", "gte", "order", "limit", "maybeSingle", "single",
      ]) {
        chain[method] = (...args: unknown[]) => {
          query.calls.push({ method, args });
          return chain;
        };
      }
      chain.then = (resolve: (value: Answer) => unknown) =>
        resolve({ data: null, error: null, ...answer(query) });
      return chain;
    },
  };
  const did = (table: string, method: string) =>
    queries.filter((q) => q.table === table && q.calls.some((c) => c.method === method));
  return { db, queries, did };
}

const state = vi.hoisted(() => ({
  owner: { userId: "owner-1" } as { userId: string } | null,
  db: null as unknown,
  emailOn: true,
  sendEmail: null as unknown as ReturnType<typeof vi.fn>,
  generateLink: null as unknown as ReturnType<typeof vi.fn>,
  verifyOtp: null as unknown as ReturnType<typeof vi.fn>,
  linkCustomer: null as unknown as ReturnType<typeof vi.fn>,
  redirectTo: null as string | null,
}));

vi.mock("@/lib/auth/studio", () => {
  class StudioAuthorizationError extends Error {}
  class StudioMfaRequiredError extends Error {}
  return {
    StudioAuthorizationError,
    StudioMfaRequiredError,
    requireStudioOwner: async () => {
      if (!state.owner) throw new StudioAuthorizationError();
      return state.owner;
    },
  };
});
vi.mock("@/lib/db/admin", () => ({
  createAdminClient: () => state.db,
}));
vi.mock("@/lib/db/server", () => ({
  createClient: async () => ({
    auth: {
      verifyOtp: (...args: unknown[]) => state.verifyOtp(...args),
      getUser: async () => ({ data: { user: null } }),
    },
  }),
}));
vi.mock("@/lib/email/resend", () => ({
  emailConfigured: () => state.emailOn,
  sendEmail: (...args: unknown[]) => state.sendEmail(...args),
}));
vi.mock("@/lib/env/server", () => ({
  serverEnv: () => ({ NEXT_PUBLIC_SITE_URL: "https://badera.world" }),
}));
vi.mock("@/lib/security/rate-limit", async (original) => ({
  ...(await original<typeof import("@/lib/security/rate-limit")>()),
  checkRateLimit: async () => ({ allowed: true }),
  clientSubject: async () => "subject",
}));
vi.mock("@/lib/account/link-customer", () => ({
  linkCustomerRecord: (...args: unknown[]) => state.linkCustomer(...args),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    state.redirectTo = to;
    throw new Error("NEXT_REDIRECT");
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  state.owner = { userId: "owner-1" };
  state.emailOn = true;
  state.sendEmail = vi.fn(async () => ({ ok: true, id: "email-1" }));
  state.generateLink = vi.fn();
  state.verifyOtp = vi.fn();
  state.linkCustomer = vi.fn(async () => undefined);
  state.redirectTo = null;
});

// ---------------------------------------------------------------------------

describe("shipping price", () => {
  it("reads amounts the way a person types them, without floating point", () => {
    expect(parseMoneyToCents("8")).toBe(800);
    expect(parseMoneyToCents("7.5")).toBe(750);
    expect(parseMoneyToCents(" $12.00 ")).toBe(1200);
    expect(parseMoneyToCents("0.29")).toBe(29);
    expect(parseMoneyToCents("1,000")).toBe(100000);
    expect(parseMoneyToCents("0")).toBe(0);
    for (const bad of ["", "-1", "abc", "7.555", "8 dollars", "1e3"]) {
      expect(parseMoneyToCents(bad), bad).toBeNull();
    }
  });

  it("charges the flat rate, and nothing from the free-shipping amount up", () => {
    const rule = { flatRateCents: 800, freeOverCents: 10000 };
    expect(shippingCentsFor(9999, rule)).toBe(800);
    expect(shippingCentsFor(10000, rule)).toBe(0);
    expect(shippingCentsFor(1_000_000, { flatRateCents: 800, freeOverCents: null })).toBe(800);
    expect(shippingCentsFor(500, { flatRateCents: 0, freeOverCents: null })).toBe(0);
  });

  it("is charged by checkout and shown by the checkout page through the same function", () => {
    const checkout = code("src/lib/checkout/create-checkout.ts");
    expect(checkout).toMatch(/getShippingRule\(\)/);
    expect(checkout).toMatch(/shippingCentsFor\(subtotalCents, shippingRule\)/);
    expect(checkout).not.toMatch(/getFlatShippingCents/);
    expect(code("src/app/(storefront)/checkout/page.tsx")).toMatch(/shippingCentsFor\(cart\.subtotalCents/);
  });

  it("still has no default: checkout refuses until the owner sets it", () => {
    const store = code("src/lib/settings/store.ts");
    expect(store).toMatch(/if \(!rule\) throw new MissingSettingError/);
  });

  it("is saved only by the owner, and every save is audited", async () => {
    const fake = fakeDb(() => ({}));
    state.db = fake.db;
    const { saveShippingAction } = await import("@/lib/studio/settings-actions");

    state.owner = null;
    expect(await saveShippingAction({ flatRate: "8", freeOver: "" })).toEqual({
      ok: false,
      message: "Studio authorization required.",
    });
    expect(fake.queries).toHaveLength(0);

    state.owner = { userId: "owner-1" };
    expect(await saveShippingAction({ flatRate: "8.00", freeOver: "100" })).toEqual({ ok: true });
    const upserts = fake.did("site_settings", "upsert").map((q) => q.calls[0].args[0]);
    expect(upserts).toEqual([
      expect.objectContaining({ key: "shipping.flat_rate_cents", value: 800, updated_by: "owner-1" }),
      expect.objectContaining({ key: "shipping.free_threshold_cents", value: 10000 }),
    ]);
    expect(fake.did("audit_events", "insert")).toHaveLength(1);
  });

  it("removes the free-shipping amount when it is cleared, and refuses nonsense", async () => {
    const fake = fakeDb(() => ({}));
    state.db = fake.db;
    const { saveShippingAction } = await import("@/lib/studio/settings-actions");

    expect(await saveShippingAction({ flatRate: "8", freeOver: "" })).toEqual({ ok: true });
    expect(fake.did("site_settings", "delete")).toHaveLength(1);

    const before = fake.queries.length;
    expect((await saveShippingAction({ flatRate: "eight", freeOver: "" })).ok).toBe(false);
    expect((await saveShippingAction({ flatRate: "5000", freeOver: "" })).ok).toBe(false);
    expect(fake.queries.length).toBe(before);
  });
});

// ---------------------------------------------------------------------------

describe("order confirmation email", () => {
  it("fills the order number and first name, and drops a missing name cleanly", () => {
    expect(fillPlaceholders("Thank you, {name}.", { order: "BE-1", name: "Ana" })).toBe("Thank you, Ana.");
    expect(fillPlaceholders("Thank you, {name}.", { order: "BE-1", name: null })).toBe("Thank you.");
    expect(fillPlaceholders("Order {order}", { order: "BE-7", name: null })).toBe("Order BE-7");
  });

  it("escapes everything people typed: product titles, addresses and the owner's words", () => {
    const email = renderOrderConfirmationEmail(
      {
        ...EXAMPLE_ORDER,
        lines: [{ title: "<script>alert(1)</script>", variant: "M", quantity: 1, lineTotalCents: 3000 }],
        shippingAddress: { ...EXAMPLE_ORDER.shippingAddress!, line1: '"><img src=x onerror=alert(1)>' },
      },
      { ...DEFAULT_ORDER_EMAIL_WORDS, heading: "<b>Hi</b>" },
      "https://badera.world",
    );
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).not.toContain("<b>Hi</b>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("shows the order's own lines and totals, and says Free for free shipping", () => {
    const email = renderOrderConfirmationEmail(
      { ...EXAMPLE_ORDER, shippingCents: 0, totalCents: 5500 },
      DEFAULT_ORDER_EMAIL_WORDS,
      "https://badera.world",
    );
    expect(email.subject).toBe("Order BE-1001 is confirmed");
    expect(email.html).toContain("Example tee");
    expect(email.html).toContain("$55.00");
    expect(email.text).toContain("Shipping: Free");
    expect(email.text).toContain("123 Example Street");
  });

  it("carries the logo as the approved image, never typeset", () => {
    const { html } = renderOrderConfirmationEmail(EXAMPLE_ORDER, DEFAULT_ORDER_EMAIL_WORDS, "https://badera.world");
    expect(html).toContain('src="https://badera.world/brand/bad-era-primary-white.png"');
    expect(html).toContain('alt="BAD ERA"');
    // Height 72px: the primary lockup only above ~48px, per the logo rules.
    expect(html).toContain('height="72"');
  });

  it("has no colour: only greys, like the storefront", () => {
    for (const hex of Object.values(EMAIL_COLORS)) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(Math.max(r, g, b) - Math.min(r, g, b), hex).toBeLessThanOrEqual(16);
    }
  });

  it("promises nothing the store does not do (there is no shipping-notice email)", () => {
    const words = Object.values(DEFAULT_ORDER_EMAIL_WORDS).join(" ");
    expect(words).not.toMatch(/when it ships|tracking|we'll email you/i);
  });

  it("is sent once per order: a webhook replay finds the order's row and sends nothing", async () => {
    const fake = fakeDb((q) =>
      q.table === "integration_events" && q.calls[0].method === "insert"
        ? { error: { code: "23505" } }
        : {},
    );
    state.db = fake.db;
    const { sendOrderConfirmation } = await import("@/lib/email/order-emails");
    const result = await sendOrderConfirmation("order-1", "auto");
    expect(result).toMatchObject({ ok: false, reason: "already_sent" });
    expect(state.sendEmail).not.toHaveBeenCalled();
  });

  it("lets the owner send again, but not over a send in flight (unless it is stuck)", async () => {
    const fake = fakeDb((q) => {
      if (q.table !== "integration_events") return {};
      if (q.calls[0].method === "insert") return { error: { code: "23505" } };
      return { data: [] }; // the conditional re-claim matched nothing: in flight
    });
    state.db = fake.db;
    const { sendOrderConfirmation } = await import("@/lib/email/order-emails");
    expect(await sendOrderConfirmation("order-1", "manual")).toMatchObject({ ok: false, reason: "in_flight" });
    const reclaim = fake.did("integration_events", "update")[0].calls;
    const condition = reclaim.find((c) => c.method === "or")?.args[0] as string;
    expect(condition).toMatch(/^status\.neq\.received,created_at\.lt\./);
    expect(state.sendEmail).not.toHaveBeenCalled();
  });

  it("records 'not set up' instead of failing when email has no key yet", async () => {
    const paidOrder = {
      order_number: "BE-1001",
      customer_email: "c@example.com",
      currency: "USD",
      subtotal_cents: 3000,
      discount_cents: 0,
      shipping_cents: 800,
      tax_cents: 0,
      total_cents: 3800,
      customer_snapshot: { email: "c@example.com", name: "Ana Example" },
      shipping_address_snapshot: { name: "Ana Example", line1: "1 St", city: "LA", region: "CA", postalCode: "90001", country: "US" },
      paid_at: "2026-11-12T00:00:00Z",
      order_items: [],
    };
    const fake = fakeDb((q) => (q.table === "orders" ? { data: paidOrder } : q.table === "site_settings" ? { data: null } : {}));
    state.db = fake.db;
    state.sendEmail = vi.fn(async () => ({ ok: false, notConfigured: true, message: "Email is not set up yet." }));
    const { sendOrderConfirmation } = await import("@/lib/email/order-emails");

    const result = await sendOrderConfirmation("order-1", "auto");
    expect(result).toMatchObject({ ok: false, reason: "not_configured" });
    const recorded = fake.did("integration_events", "update").map((q) => q.calls[0].args[0]);
    expect(recorded).toContainEqual(expect.objectContaining({ status: "ignored" }));
    expect(state.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "c@example.com", idempotencyKey: "order-confirmation/order-1" }),
    );
  });

  it("goes out after the webhook has answered, only for an order it converted", () => {
    const route = code("src/app/api/webhooks/stripe/route.ts");
    expect(route).toMatch(/const orderId = await handleStripeCheckoutEvent/);
    expect(route).toMatch(/if \(orderId\) \{\s*after\(/);
    // Never from the success page.
    expect(code("src/app/(storefront)/checkout/success/page.tsx")).not.toMatch(/sendOrderConfirmation|sendEmail/);
  });
});

describe("the Stripe handler reports the order it converted", () => {
  const session = (status: string) =>
    ({ id: "evt-1", type: "checkout.session.completed", data: { object: { id: "cs_1", payment_status: status, payment_intent: "pi_1" } } }) as unknown as Stripe.Event;
  const rpc = (claimed = true): CommerceRpc => ({
    claimStripeEvent: async () => claimed,
    finishStripeEvent: async () => undefined,
    checkoutIdFromStripeSession: async () => "checkout-1",
    convertPaidCheckout: async () => "order-9",
    markCheckoutPaymentPending: async () => undefined,
    releaseCheckoutInventory: async () => undefined,
  });

  it("returns the order id for a paid session", async () => {
    expect(await handleStripeCheckoutEvent(session("paid"), rpc())).toBe("order-9");
  });

  it("returns null for an unpaid session and for a duplicate delivery", async () => {
    expect(await handleStripeCheckoutEvent(session("unpaid"), rpc())).toBeNull();
    expect(await handleStripeCheckoutEvent(session("paid"), rpc(false))).toBeNull();
  });
});

describe("Stripe retries (migration 0018)", () => {
  it("re-claims a failed event, and still refuses a processed one", () => {
    const sql = code("supabase/migrations/0018_stripe_event_retry.sql");
    expect(sql).toMatch(/on conflict \(stripe_event_id\) do update/);
    expect(sql).toMatch(/processing_status = 'failed'/);
    expect(sql).toMatch(/set search_path = ''/);
    expect(code("tests/integration/sql/acceptance.sql")).toMatch(/PASS case 21/);
  });
});

// ---------------------------------------------------------------------------

describe("order addresses", () => {
  it("reads the address checkout writes, and the older spelling", () => {
    const fromCheckout = readOrderAddress({ name: "Ana", line1: "1 St", city: "LA", region: "CA", postalCode: "90001", country: "US" });
    const older = readOrderAddress({ recipient_name: "Ana", line1: "1 St", city: "LA", region: "CA", postal_code: "90001", country_code: "US" });
    expect(fromCheckout).toEqual(older);
    expect(orderAddressLines(fromCheckout)).toEqual(["Ana", "1 St", "LA, CA 90001", "US"]);
    expect(readOrderAddress(null).name).toBe("");
  });

  it("is read through the one reader on every screen that shows it", () => {
    for (const file of [
      "src/components/studio/ready-to-ship-card.tsx",
      "src/components/studio/supplier-task-card.tsx",
      "src/app/studio/(workspace)/orders/[orderId]/page.tsx",
      "src/app/(storefront)/account/orders/[orderNumber]/page.tsx",
    ]) {
      const source = code(file);
      expect(source, file).toMatch(/readOrderAddress\(/);
      expect(source, file).not.toMatch(/recipient_name|postal_code|country_code/);
    }
  });
});

// ---------------------------------------------------------------------------

describe("customer accounts", () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    return data;
  };

  it("are not opened while email is not set up: nobody could confirm them", async () => {
    state.emailOn = false;
    const generateLink = vi.fn();
    state.db = { auth: { admin: { generateLink } } };
    const { signUpAction } = await import("@/lib/auth/actions");
    const result = await signUpAction(form({ email: "a@example.com", password: "long-enough-1" }));
    expect(result.ok).toBe(false);
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("mail a confirmation link that lands on this site's confirm page", async () => {
    const generateLink = vi.fn(async () => ({
      data: { user: { id: "u1" }, properties: { hashed_token: "hash-123456", verification_type: "signup" } },
      error: null,
    }));
    state.db = { auth: { admin: { generateLink } } };
    const { signUpAction } = await import("@/lib/auth/actions");
    const result = await signUpAction(form({ email: "A@Example.com", password: "long-enough-1" }));
    expect(result.ok).toBe(true);
    expect(generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: "signup", email: "a@example.com" }));
    const sent = state.sendEmail.mock.calls[0][0] as { to: string; html: string };
    expect(sent.to).toBe("a@example.com");
    expect(sent.html).toContain("https://badera.world/auth/confirm?token_hash=hash-123456&amp;type=signup");
  });

  it("answer an address that already has an account exactly as a new one", async () => {
    const make = (error: unknown) =>
      vi.fn(async () =>
        error
          ? { data: { user: null, properties: null }, error }
          : { data: { user: { id: "u1" }, properties: { hashed_token: "hash-123456", verification_type: "signup" } }, error: null },
      );
    const { signUpAction } = await import("@/lib/auth/actions");

    state.db = { auth: { admin: { generateLink: make(null) } } };
    const fresh = await signUpAction(form({ email: "a@example.com", password: "long-enough-1" }));
    state.db = { auth: { admin: { generateLink: make({ code: "email_exists", message: "A user with this email address has already been registered" }) } } };
    const taken = await signUpAction(form({ email: "a@example.com", password: "long-enough-1" }));

    expect(taken).toEqual(fresh);
    // The truth goes to the inbox only.
    expect(state.sendEmail).toHaveBeenLastCalledWith(expect.objectContaining({ subject: "You already have an account" }));
  });

  it("answer a reset request the same whether or not the account exists", async () => {
    const { requestPasswordResetAction } = await import("@/lib/auth/actions");
    state.db = { auth: { admin: { generateLink: vi.fn(async () => ({ data: { user: null, properties: null }, error: { status: 404, code: "user_not_found", message: "User not found" } })) } } };
    const unknown = await requestPasswordResetAction(form({ email: "nobody@example.com" }));
    state.db = { auth: { admin: { generateLink: vi.fn(async () => ({ data: { user: { id: "u1" }, properties: { hashed_token: "hash-123456", verification_type: "recovery" } }, error: null })) } } };
    const known = await requestPasswordResetAction(form({ email: "nobody@example.com" }));
    expect(unknown).toEqual(known);
    expect(state.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("use the emailed token only when the customer presses the button, then link their orders", async () => {
    const page = code("src/app/auth/confirm/page.tsx");
    expect(page).not.toMatch(/verifyOtp/);

    state.verifyOtp = vi.fn(async () => ({ data: { user: { id: "u1", email: "a@example.com" } }, error: null }));
    const { confirmEmailLinkAction } = await import("@/lib/auth/actions");
    await expect(
      confirmEmailLinkAction(form({ token_hash: "hash-123456", type: "signup", next: "//evil.example" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(state.verifyOtp).toHaveBeenCalledWith({ token_hash: "hash-123456", type: "signup" });
    expect(state.linkCustomer).toHaveBeenCalledWith({ id: "u1", email: "a@example.com" });
    // An unsafe `next` falls back to the account, never off-site.
    expect(state.redirectTo).toBe("/account");
  });

  it("send a used reset link to choose a password, without linking anything", async () => {
    state.verifyOtp = vi.fn(async () => ({ data: { user: { id: "u1", email: "a@example.com" } }, error: null }));
    const { confirmEmailLinkAction } = await import("@/lib/auth/actions");
    await expect(confirmEmailLinkAction(form({ token_hash: "hash-123456", type: "recovery" }))).rejects.toThrow();
    expect(state.redirectTo).toBe("/account/password?reset=1");
    expect(state.linkCustomer).not.toHaveBeenCalled();
  });

  it("never take over a customer record already linked to another sign-in", () => {
    const source = code("src/lib/account/link-customer.ts");
    expect(source).toMatch(/if \(existing\.auth_user_id\) \{/);
    expect(source).toMatch(/\.is\("auth_user_id", null\)/);
  });

  it("are rate limited, failing closed like sign-in", async () => {
    const { RATE_LIMITS } = await import("@/lib/security/rate-limit");
    for (const rule of [RATE_LIMITS.signUp, RATE_LIMITS.passwordReset, RATE_LIMITS.emailLink]) {
      expect(rule.onFailure).toBe("deny");
    }
  });

  it("emails carry the link both as a button and as plain text", () => {
    for (const mail of [
      confirmEmailMessage("https://badera.world", "https://badera.world/auth/confirm?token_hash=x&type=signup"),
      resetPasswordMessage("https://badera.world", "https://badera.world/auth/confirm?token_hash=x&type=recovery"),
    ]) {
      expect(mail.text).toContain("https://badera.world/auth/confirm?token_hash=x");
      expect(mail.html).toContain("token_hash=x&amp;type=");
    }
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { redact } from "@/lib/observability/logger";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

/**
 * Phase 9 — hardening invariants (Master Spec §17, §19).
 *
 * The log redaction and the rate-limit rule table are pure and tested directly.
 * The header policy and the static/dynamic rendering rule are properties of
 * source files, so they are asserted statically — a CSP regression is exactly
 * the kind of thing that is invisible until someone opens a browser console in
 * production.
 */

function code(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

describe("log redaction", () => {
  it("redacts values by key name, however nested", () => {
    const out = redact({
      orderId: "ord_123",
      customer: {
        email: "someone@example.com",
        phone: "+15551234567",
        shipping_address: { street: "1 Test Way", postal_code: "90210" },
      },
    }) as Record<string, unknown>;

    expect(out.orderId).toBe("ord_123");
    const customer = out.customer as Record<string, unknown>;
    expect(customer.email).toBe("[redacted]");
    expect(customer.phone).toBe("[redacted]");
    // The whole address object goes, not just its leaves.
    expect(customer.shipping_address).toBe("[redacted]");
  });

  it("matches key names case- and separator-insensitively", () => {
    const out = redact({
      customerEmail: "a@b.com",
      customer_email: "a@b.com",
      EMAIL: "a@b.com",
      firstName: "Ada",
    }) as Record<string, unknown>;

    for (const value of Object.values(out)) {
      expect(value).toBe("[redacted]");
    }
  });

  /**
   * The key-name deny list only helps when the secret arrives under a known
   * key. A Stripe error message with a key pasted into it does not, so values
   * are scrubbed by shape too.
   */
  it("scrubs secrets that appear inside free text", () => {
    const out = redact({
      note: "call failed with sk_live_abc123DEF456ghi and whsec_zzz999",
    }) as Record<string, string>;

    expect(out.note).not.toContain("sk_live_abc123DEF456ghi");
    expect(out.note).not.toContain("whsec_zzz999");
    expect(out.note).toContain("[redacted]");
  });

  it("scrubs card-length digit runs", () => {
    const out = redact({ detail: "declined 4242424242424242" }) as Record<
      string,
      string
    >;
    expect(out.detail).not.toContain("4242424242424242");
  });

  it("scrubs JWTs, which is what a service-role key looks like", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abc123";
    const out = redact({ detail: `token ${jwt}` }) as Record<string, string>;
    expect(out.detail).not.toContain(jwt);
  });

  it("unwraps Errors instead of logging them whole", () => {
    const error = Object.assign(new Error("boom"), {
      // A PostgrestError or StripeError carries payload data on properties
      // nobody remembers are there. Only name/message/stack should survive.
      customerEmail: "leak@example.com",
    });
    const out = redact(error) as Record<string, unknown>;

    expect(out.message).toBe("boom");
    expect(out.customerEmail).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain("leak@example.com");
  });

  it("terminates on deeply nested and circular-ish input", () => {
    let nested: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 20; i++) nested = { nested };
    expect(() => JSON.stringify(redact(nested))).not.toThrow();
  });
});

describe("rate limit rules", () => {
  it("gives every rule its own bucket", () => {
    const buckets = Object.values(RATE_LIMITS).map((rule) => rule.bucket);
    expect(new Set(buckets).size).toBe(buckets.length);
  });

  it("uses positive limits and windows", () => {
    for (const rule of Object.values(RATE_LIMITS)) {
      expect(rule.limit).toBeGreaterThan(0);
      expect(rule.windowSeconds).toBeGreaterThan(0);
    }
  });

  /**
   * The auth buckets are the ones that must not degrade into being unmetered
   * when the limiter itself is unavailable — that is precisely when an attacker
   * would want them open.
   */
  it("fails closed on the authentication buckets", () => {
    expect(RATE_LIMITS.signIn.onFailure).toBe("deny");
    expect(RATE_LIMITS.mfaChallenge.onFailure).toBe("deny");
  });

  /** Customer-facing help must never be blocked by our own outage. */
  it("fails open on customer support paths", () => {
    expect(RATE_LIMITS.supportCase.onFailure).toBe("allow");
    expect(RATE_LIMITS.supportMessage.onFailure).toBe("allow");
    expect(RATE_LIMITS.returnRequest.onFailure).toBe("allow");
  });

  it("never writes a raw identifier to the counter table", () => {
    const source = code("src/lib/security/rate-limit.ts");
    // Everything reaching the RPC goes through hashSubject().
    expect(source).toContain("p_subject: hashSubject(subject)");
  });
});

describe("security headers", () => {
  const source = code("middleware.ts");

  it("sets a nonce-based script policy, not unsafe-inline", () => {
    expect(source).toContain("'strict-dynamic'");
    expect(source).toContain("`'nonce-${nonce}`" .slice(0, 10));
    // unsafe-inline may appear for style, never for script.
    const scriptSrc = source.slice(
      source.indexOf('"script-src"'),
      source.indexOf('"style-src"'),
    );
    expect(scriptSrc).not.toContain("unsafe-inline");
  });

  it("generates a fresh nonce per request", () => {
    // A module-level constant would be reused across every request, which
    // makes the nonce forgeable by anyone who has seen one page.
    expect(source).toMatch(/const nonce = .*randomUUID\(\)/);
  });

  it("forbids object and base-uri, and pins form-action", () => {
    expect(source).toContain('"object-src": ["\'none\'"]');
    expect(source).toContain('"base-uri": ["\'self\'"]');
    expect(source).toContain('"form-action": ["\'self\'"]');
  });

  it("keeps HSTS out of development", () => {
    const hsts = source.slice(source.indexOf("Strict-Transport-Security") - 300);
    expect(hsts).toContain('process.env.NODE_ENV === "production"');
    // preload is a one-way door and is the owner's decision, not a default.
    expect(source).not.toContain("preload");
  });

  it("sets the baseline headers", () => {
    for (const header of [
      "X-Content-Type-Options",
      "Referrer-Policy",
      "X-Frame-Options",
      "Permissions-Policy",
      "Cross-Origin-Opener-Policy",
    ]) {
      expect(source).toContain(header);
    }
  });

  it("keeps Studio and preview out of search indexes", () => {
    expect(source).toContain("X-Robots-Tag");
    expect(source).toContain('pathname.startsWith("/studio")');
  });
});

describe("CSP requires dynamic rendering", () => {
  /**
   * A statically prerendered page cannot carry a per-request nonce, so every
   * script tag on it is blocked by the policy above and the page serves
   * unhydrated. Measured during Phase 9: the prerendered homepage rendered 13
   * script tags with 0 nonces, while a dynamic route rendered 11 of 11.
   *
   * So any public page that ships interactive JS must opt out of prerendering.
   * This test is the guard against someone restoring `revalidate` for
   * performance without realising it silently disables the CSP on that page.
   */
  const MUST_BE_DYNAMIC = [
    "src/app/(storefront)/page.tsx",
    "src/app/(storefront)/shop/page.tsx",
    "src/app/(storefront)/support/page.tsx",
    "src/app/(storefront)/checkout/success/page.tsx",
    "src/app/(storefront)/checkout/cancelled/page.tsx",
    "src/app/(storefront)/[...unmatched]/page.tsx",
  ];

  it.each(MUST_BE_DYNAMIC)("%s opts out of prerendering", (file) => {
    const source = code(file);
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).not.toMatch(/export const revalidate/);
  });

  it("keeps the catalog read cached so dynamic rendering costs no extra query", () => {
    const source = code("src/lib/catalog/cache.ts");
    expect(source).toContain("unstable_cache");
    expect(source).toContain("revalidate:");
  });
});

describe("upload validation", () => {
  const source = code("src/lib/studio/media-actions.ts");

  /**
   * `file.type` comes from the browser. Renaming payload.html to payload.png
   * and setting the Content-Type is trivial, so the bytes have to be checked.
   */
  it("checks magic bytes, not just the declared type", () => {
    expect(source).toContain("verifyFileSignature");
    expect(source).toContain("SIGNATURES");
  });

  it("refuses SVGs carrying script or embedded content", () => {
    expect(source).toContain("<script");
    expect(source).toContain("foreignobject");
    expect(source).toContain("javascript:");
  });
});

describe("SEO", () => {
  it("keeps private areas out of robots.txt", () => {
    const source = code("src/app/robots.ts");
    for (const path of ["/studio", "/account", "/api/", "/checkout/"]) {
      expect(source).toContain(path);
    }
  });

  /**
   * The sitemap lists public routes explicitly rather than filtering a full
   * route list, so a new Studio route cannot leak in by being forgotten.
   */
  it("builds the sitemap from an allowlist", () => {
    const source = code("src/app/sitemap.ts");
    expect(source).toContain("ALWAYS_INDEXED");
    expect(source).toContain("CONTENT_PAGES");
    expect(source).not.toContain("/studio");
    expect(source).not.toContain("/account");
  });

  /**
   * Phase 10 QA caught the sitemap advertising `/about`, `/privacy` and the
   * rest before those routes existed, pointing crawlers at 404s. The routes
   * exist now, but an unpublished policy page renders a "not published yet"
   * placeholder — submitting that as canonical content is the same mistake one
   * step later. Each information page is listed only once it has published
   * sections behind it.
   */
  it("lists an information page only once it has published content", () => {
    const source = code("src/app/sitemap.ts");
    expect(source).toContain("getPublishedSections");
    expect(source).toMatch(/if \(!published\) continue/);
  });
});

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Customer-facing reads must never carry internal commerce data.
 *
 * Master Spec §7 and §10.5.8: supplier cost, provider identity and
 * credentials, internal notes, audit rows and raw provider errors are Studio-
 * only. A column list is the boundary, so this asserts on the source of the
 * query modules rather than on a runtime response — it catches a leak the day
 * the column is added, without needing a populated database.
 */

const FORBIDDEN = [
  "supplier_cost_cents",
  "internal_unit_cost_cents",
  "credentials_secret_ref",
  "variant_financials",
  "supplier_tasks",
  "audit_events",
  "diagnostic_reference",
  "provider_attempts",
  "ordering_url",
];

/**
 * Strip comments before asserting.
 *
 * These files legitimately NAME the forbidden columns in doc comments that warn
 * against selecting them. The invariant is about what the code selects, so
 * checking raw source produces false positives on its own documentation.
 */
function code(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

const CUSTOMER_FACING = [
  "src/lib/orders/queries.ts",
  "src/lib/account/queries.ts",
  "src/lib/account/session.ts",
  "src/lib/catalog/queries.ts",
  "src/lib/cart/service.ts",
];

describe("customer-facing reads", () => {
  it.each(CUSTOMER_FACING)("%s selects no internal column", (file) => {
    const source = code(file);
    for (const term of FORBIDDEN) {
      expect(source, `${file} must not reference ${term}`).not.toContain(term);
    }
  });

  it.each(CUSTOMER_FACING)("%s never uses select(*)", (file) => {
    const source = code(file);
    // select("*") on a table with cost or credential columns is how internal
    // data leaks by accident. Every read lists its columns.
    expect(source).not.toMatch(/\.select\(\s*["'`]\*/);
  });
});

describe("studio reads", () => {
  it("scopes customer order access by customer id", () => {
    const source = readFileSync("src/lib/orders/queries.ts", "utf8");
    // getCustomerOrder runs on the service-role client, which bypasses RLS,
    // so ownership must be enforced in the query itself.
    expect(source).toContain('.eq("customer_id", customerId)');
  });

  it("scopes account mutations to the resolved identity, not a form field", () => {
    const source = readFileSync("src/lib/account/actions.ts", "utf8");
    expect(source).toContain("identity.customerId");
    // The customer id must never be read from user input.
    expect(source).not.toMatch(/formData\.get\(\s*["'`]customerId/);
  });
});

describe("storefront never imports fulfillment internals", () => {
  /**
   * Supplier cost, provider identity and issue diagnostics live in the
   * fulfillment and studio modules. Those are Studio-only.
   *
   * The component code itself legitimately appears in a client chunk — it is a
   * Client Component. What must never happen is a STOREFRONT surface importing
   * it, which would ship provider and cost fields onto a customer's page. This
   * asserts the import boundary, because the import is the thing that would
   * actually cause the leak.
   */
  const STOREFRONT_ROOTS = [
    "src/app/(storefront)",
    "src/components/storefront",
    "src/components/sections",
    "src/components/account",
  ];

  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
    return out;
  }

  it("no storefront file imports a fulfillment or studio module", () => {
    const offenders: string[] = [];
    for (const root of STOREFRONT_ROOTS) {
      for (const file of walk(root)) {
        const source = readFileSync(file, "utf8");
        if (/from\s+["\`']@\/lib\/(fulfillment|studio)\//.test(source)) {
          offenders.push(file);
        }
      }
    }
    expect(offenders, `storefront files importing internal modules: ${offenders.join(", ")}`).toEqual([]);
  });
});

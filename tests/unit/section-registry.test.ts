import { describe, expect, it } from "vitest";

import { SECTION_REGISTRY, ctaSchema, parseSection } from "@/lib/cms/registry";
import { REGISTERED_SECTION_TYPES } from "@/lib/cms/sections";
import { DEFAULT_HOME_SECTIONS } from "@/lib/cms/default-home";

/**
 * The Site Editor's safety rests on the registry being a closed, typed set.
 * These tests exist so a future field addition cannot quietly reopen the door
 * that Master Spec §11.4.4 closes.
 */

describe("section registry", () => {
  it("registers every section type", () => {
    for (const type of REGISTERED_SECTION_TYPES) {
      expect(SECTION_REGISTRY[type], `missing registry entry for ${type}`).toBeDefined();
    }
  });

  it("exposes no design controls anywhere in the inspector", () => {
    // The editor must never expose arbitrary CSS, font family or size,
    // unrestricted colour, absolute positioning, or raw HTML/JS.
    const allowedKinds = new Set([
      "text",
      "textarea",
      "media",
      "cta",
      "productList",
      "repeater",
    ]);

    const walk = (fields: { kind: string; fields?: unknown[] }[]) => {
      for (const field of fields) {
        expect(allowedKinds.has(field.kind), `disallowed field kind: ${field.kind}`).toBe(true);
        if (field.kind === "repeater") {
          walk((field as { fields: { kind: string }[] }).fields);
        }
      }
    };

    for (const definition of Object.values(SECTION_REGISTRY)) {
      walk(definition.fields as { kind: string }[]);
    }
  });

  it("gives every text field a maximum length", () => {
    // Unbounded text is how a layout gets broken by content.
    const walk = (fields: { kind: string; maxLength?: number; fields?: unknown[] }[]) => {
      for (const field of fields) {
        if (field.kind === "text" || field.kind === "textarea") {
          expect(field.maxLength, "text field without maxLength").toBeGreaterThan(0);
        }
        if (field.kind === "repeater") {
          walk((field as { fields: { kind: string }[] }).fields);
        }
      }
    };
    for (const definition of Object.values(SECTION_REGISTRY)) {
      walk(definition.fields as { kind: string }[]);
    }
  });
});

describe("cta destination validation", () => {
  const valid = ["/shop", "/products/original-tee", "https://instagram.com/badera"];
  const invalid = [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "//evil.example.com",
    "vbscript:msgbox(1)",
    "shop",
  ];

  it.each(valid)("accepts %s", (href) => {
    expect(ctaSchema.safeParse({ label: "Go", href, enabled: true }).success).toBe(true);
  });

  it.each(invalid)("rejects %s", (href) => {
    expect(ctaSchema.safeParse({ label: "Go", href, enabled: true }).success).toBe(false);
  });
});

describe("default home content", () => {
  it("validates against the registry schemas", () => {
    // The seeded database rows were generated from this module, so if these
    // parse, the live homepage payloads parse too.
    for (const section of DEFAULT_HOME_SECTIONS) {
      const stripped = { ...section } as Record<string, unknown>;
      // `url` is resolved at render time and never persisted.
      if (stripped.media && typeof stripped.media === "object") {
        delete (stripped.media as Record<string, unknown>).url;
      }
      const result = parseSection(stripped);
      expect(result.success, `${section.type} failed: ${JSON.stringify(
        result.success ? [] : result.error.issues,
      )}`).toBe(true);
    }
  });

  it("keeps the removed homepage elements out", () => {
    const serialised = JSON.stringify(DEFAULT_HOME_SECTIONS).toLowerCase();
    // The approved revision removed both of these; they must not come back.
    expect(serialised).not.toContain("not a scammer");
    expect(serialised).not.toContain("outerwear");
  });

  it("uses no sale or urgency language in the Archive module", () => {
    const archive = DEFAULT_HOME_SECTIONS.find((s) => s.type === "archive01.feature");
    const text = JSON.stringify(archive).toLowerCase();
    for (const banned of ["sale", "clearance", "% off", "hurry", "last chance", "discount"]) {
      expect(text, `Archive 01 must never use "${banned}"`).not.toContain(banned);
    }
  });
});

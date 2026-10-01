import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { renderSections } from "@/components/sections/render";
import { DEFAULT_HOME_SECTIONS } from "@/lib/cms/default-home";
import {
  isTrustedMessage,
  parseEditorMessage,
  parsePreviewMessage,
} from "@/lib/cms/edit-messages";
import {
  applyFieldEdit,
  countChangedSections,
  decodeEditTarget,
  encodeEditTarget,
  resolveEditTarget,
} from "@/lib/cms/edit-targets";
import { SECTION_REGISTRY } from "@/lib/cms/registry";
import type { LegalProseSection, Section } from "@/lib/cms/sections";

/**
 * Click-to-edit (the on-page editor, and the Site Editor's clickable preview).
 *
 * The guardrail this protects: a click on the page can only ever open one of
 * the registry's six field kinds for a field the registry declares. It can
 * never reach a colour, a font, a size, a position, CSS or markup — and the
 * public site never carries the click targets at all.
 */

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} />;
  },
}));

const LEGAL: LegalProseSection = {
  type: "legal.prose",
  sectionId: "privacy-content",
  enabled: true,
  schemaVersion: 1,
  heading: "Privacy",
  meta: "",
  body: "",
};

const ALL: Section[] = [...DEFAULT_HOME_SECTIONS, LEGAL];
const SIX_KINDS = ["text", "textarea", "media", "cta", "productList", "repeater"];

// --- Targets ------------------------------------------------------------------

describe("edit targets", () => {
  it("round-trips a target", () => {
    expect(decodeEditTarget(encodeEditTarget("home-hero", "headline"))).toEqual({
      sectionKey: "home-hero",
      path: "headline",
    });
    expect(decodeEditTarget("home-stories::tiles.2.media")).toEqual({
      sectionKey: "home-stories",
      path: "tiles.2.media",
    });
  });

  it.each([
    "",
    "headline",
    "::headline",
    "home hero::headline",
    "<img src=x>::headline",
    "home-hero::",
    "home-hero::a.b.c.d",
    "home-hero::tiles..media",
    "home-hero::__proto__",
    "home-hero::cta.href",
    "home-hero::tiles.999.media",
    `home-hero::${"a".repeat(300)}`,
  ])("refuses a malformed attribute: %j", (raw) => {
    const target = decodeEditTarget(raw);
    if (target) {
      // Shape-valid but must still resolve to nothing in the registry.
      const hero = DEFAULT_HOME_SECTIONS[0];
      expect(resolveEditTarget(hero, target.path)).toBeNull();
    } else {
      expect(target).toBeNull();
    }
  });

  it("resolves every field the registry declares, and only to the six kinds", () => {
    for (const section of ALL) {
      const definition = SECTION_REGISTRY[section.type];
      for (const field of definition.fields) {
        if (field.kind === "repeater") {
          const items = (section as unknown as Record<string, unknown[]>)[field.path];
          items.forEach((_, index) => {
            for (const child of field.fields) {
              const resolved = resolveEditTarget(section, `${field.path}.${index}.${child.path}`);
              expect(resolved, `${section.type} ${field.path}.${index}.${child.path}`).not.toBeNull();
              expect(SIX_KINDS).toContain(resolved!.field.kind);
              expect(resolved!.inspectorPath).toBe(field.path);
            }
          });
          // A whole list is not one thing to click.
          expect(resolveEditTarget(section, field.path)).toBeNull();
          expect(resolveEditTarget(section, `${field.path}.${items.length}.${field.fields[0].path}`)).toBeNull();
        } else {
          const resolved = resolveEditTarget(section, field.path);
          expect(resolved, `${section.type} ${field.path}`).not.toBeNull();
          expect(SIX_KINDS).toContain(resolved!.field.kind);
        }
      }
    }
  });

  it("names repeater items the way an owner would", () => {
    const grid = DEFAULT_HOME_SECTIONS.find((s) => s.type === "editorial.story_grid")!;
    expect(resolveEditTarget(grid, "tiles.1.headline")?.label).toBe("Tile 2 · Headline");
    expect(resolveEditTarget(grid, "tiles.1.headline")?.sectionLabel).toBe("Story grid");
  });

  it.each(["type", "sectionId", "enabled", "schemaVersion", "constructor", "prototype", "style", "className", "font", "color"])(
    "never writes a key the registry does not offer: %s",
    (key) => {
      const hero = DEFAULT_HOME_SECTIONS[0];
      expect(applyFieldEdit(hero, key, "x")).toBeNull();
    },
  );

  it("edits a copy, never the section it was given", () => {
    const grid = DEFAULT_HOME_SECTIONS.find((s) => s.type === "editorial.story_grid")!;
    const before = JSON.stringify(grid);
    const next = applyFieldEdit(grid, "tiles.0.headline", "Changed") as typeof grid;
    expect(JSON.stringify(grid)).toBe(before);
    expect(next.tiles[0].headline).toBe("Changed");
    expect(next.tiles[1]).toBe(grid.tiles[1]); // untouched items are shared, not cloned
    expect(next.tiles).not.toBe(grid.tiles);
  });
});

// --- Change counting ----------------------------------------------------------

describe("countChangedSections", () => {
  const live = DEFAULT_HOME_SECTIONS;

  it("is zero when nothing changed, whatever the key order or resolved URLs", () => {
    const reverseKeys = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(reverseKeys)
        : value && typeof value === "object"
          ? Object.fromEntries(
              Object.keys(value as object)
                .reverse()
                .map((k) => [k, reverseKeys((value as Record<string, unknown>)[k])]),
            )
          : value;
    const reordered = live.map((s) => reverseKeys(s) as Section);
    expect(Object.keys(reordered[0])).not.toEqual(Object.keys(live[0]));
    expect(countChangedSections(reordered, live)).toBe(0);
    const withUrl = live.map((s) =>
      s.type === "hero.editorial" ? { ...s, media: { ...s.media, url: "https://x/y.jpg" } } : s,
    );
    expect(countChangedSections(withUrl, live)).toBe(0);
  });

  it("counts a changed section once, however many fields changed", () => {
    const draft = live.map((s) =>
      s.type === "hero.editorial" ? { ...s, headline: "New", supportingLine: "Also new" } : s,
    );
    expect(countChangedSections(draft, live)).toBe(1);
  });

  it("counts every section on a page that has never been published", () => {
    expect(countChangedSections(live, null)).toBe(live.length);
  });

  it("counts a section that is live but no longer in the draft", () => {
    expect(countChangedSections(live.slice(1), live)).toBe(1);
  });
});

// --- Rendering ----------------------------------------------------------------

describe("rendering", () => {
  const attributes = (html: string, name: string) =>
    [...html.matchAll(new RegExp(`${name}="([^"]*)"`, "g"))].map((m) => m[1].replace(/&amp;/g, "&"));

  it("gives customers no click targets, stand-ins or section wrappers", () => {
    const html = renderToStaticMarkup(<>{renderSections(ALL, [])}</>);
    expect(html).not.toMatch(/data-be-/);
  });

  it("marks only real registry fields when editing", () => {
    const html = renderToStaticMarkup(<>{renderSections(ALL, [], { editing: true })}</>);
    const targets = attributes(html, "data-be-edit");
    expect(targets.length).toBeGreaterThan(20);
    for (const raw of targets) {
      const target = decodeEditTarget(raw);
      expect(target, raw).not.toBeNull();
      const section = ALL.find((s) => s.sectionId === target!.sectionKey)!;
      expect(resolveEditTarget(section, target!.path), raw).not.toBeNull();
    }
    // Everything a customer can read on the homepage is reachable.
    for (const expected of [
      "home-hero::headline",
      "home-hero::media",
      "home-hero::cta",
      "home-hero::supportingLine",
      "home-trust::items.2.detail",
      "home-era-00::eyebrow",
      "home-stories::tiles.2.media",
      "privacy-content::body",
    ]) {
      expect(targets).toContain(expected);
    }
    expect(attributes(html, "data-be-section")).toEqual(
      ALL.filter((s) => s.enabled).map((s) => s.sectionId),
    );
  });

  it("offers an empty optional field and a hidden button as something to click", () => {
    const hero = { ...DEFAULT_HOME_SECTIONS[0], cta: { label: "Shop now", href: "/shop", enabled: false } } as Section;
    const editing = renderToStaticMarkup(<>{renderSections([hero], [], { editing: true })}</>);
    expect(editing).toContain("+ Add a supporting line");
    expect(editing).toContain("Shop now · hidden");
    const live = renderToStaticMarkup(<>{renderSections([hero], [])}</>);
    expect(live).not.toContain("Add a supporting line");
    expect(live).not.toContain("· hidden");
  });
});

// --- Messages between the Site Editor and its preview -------------------------

describe("preview messages", () => {
  it("accepts a select for a well-formed target only", () => {
    expect(parsePreviewMessage({ type: "be:select", sectionKey: "home-hero", path: "headline" })).toEqual({
      type: "be:select",
      sectionKey: "home-hero",
      path: "headline",
    });
    for (const bad of [
      null,
      "be:select",
      { type: "be:select", sectionKey: "home hero", path: "headline" },
      { type: "be:select", sectionKey: "home-hero", path: "a.b.c.d" },
      { type: "be:select", sectionKey: "home-hero" },
      { type: "be:eval", code: "alert(1)" },
    ]) {
      expect(parsePreviewMessage(bad)).toBeNull();
    }
  });

  it("accepts only refresh and highlight from the editor", () => {
    expect(parseEditorMessage({ type: "be:refresh" })).toEqual({ type: "be:refresh" });
    expect(parseEditorMessage({ type: "be:highlight", sectionKey: "home-hero" })).toEqual({
      type: "be:highlight",
      sectionKey: "home-hero",
    });
    expect(parseEditorMessage({ type: "be:navigate", href: "https://evil.example" })).toBeNull();
    expect(parseEditorMessage({ type: "be:highlight", sectionKey: "<x>" })).toBeNull();
  });

  it("trusts only the expected window at the expected origin", () => {
    const frame = {};
    const ok = { origin: "https://bad-era.example", source: frame };
    expect(isTrustedMessage(ok, ok)).toBe(true);
    expect(isTrustedMessage({ ...ok, origin: "https://evil.example" }, ok)).toBe(false);
    expect(isTrustedMessage({ ...ok, source: {} }, ok)).toBe(false);
    expect(isTrustedMessage({ ...ok, source: null }, { ...ok, source: null })).toBe(false);
  });
});

// --- Where editing can and cannot happen --------------------------------------

const ROOT = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
/** Source without comments, so prose explaining what is avoided is not code. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(ROOT, path)).isDirectory() ? files(path) : [path];
  });
}

describe("boundaries", () => {
  it("only owner-gated Studio routes render the page for editing", () => {
    const editingCallers = files("src")
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => /editing:\s*true/.test(read(f)));
    expect(editingCallers.sort()).toEqual([
      "src/app/studio/(fullscreen)/edit/[page]/page.tsx",
      "src/app/studio/(fullscreen)/site/[page]/preview/page.tsx",
    ]);
    for (const route of editingCallers) {
      expect(read(route), route).toMatch(/getStudioIdentityForRender\(\)[\s\S]*notFound\(\)/);
    }
  });

  it("the editing surfaces offer no styling, markup or free-form editing", () => {
    const surfaces = [
      ...files("src/components/studio/on-page"),
      "src/components/studio/media-field.tsx",
      "src/components/studio/inspector.tsx",
      "src/components/studio/preview-bridge.tsx",
      "src/components/studio/edit-surface.ts",
    ];
    for (const file of surfaces) {
      const source = code(file);
      expect(source, file).not.toMatch(/type="color"|contentEditable|dangerouslySetInnerHTML|innerHTML\s*=/);
    }
  });

  it("the on-page editor and the full-field editor sit outside Studio's navigation", () => {
    expect(() => read("src/app/studio/(fullscreen)/edit/[page]/page.tsx")).not.toThrow();
    expect(() => read("src/app/studio/(fullscreen)/site/[page]/page.tsx")).not.toThrow();
    expect(() => read("src/app/studio/(workspace)/site/[page]/page.tsx")).toThrow();
  });
});

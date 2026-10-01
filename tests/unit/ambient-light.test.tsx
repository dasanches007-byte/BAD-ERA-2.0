import { readFileSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { HeroSpotlight } from "@/components/sections/hero-spotlight";
import { renderSections } from "@/components/sections/render";
import { SiteHeader } from "@/components/storefront/site-header";
import { DEFAULT_HOME_SECTIONS } from "@/lib/cms/default-home";

/**
 * Ambient light: the underglow (header LED, Archive 01 shelf light) and the
 * gallery spotlight on the hero, chosen by the owner.
 *
 * What must stay true: the light is decoration only — never focusable, never
 * clickable, never announced; it is warm white, so it adds presence without
 * adding colour; and anyone who asks for reduced motion gets stillness.
 */

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={typeof props.src === "string" ? props.src : "/logo.png"} />;
  },
}));

const ROOT = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const css = read("src/app/globals.css");
const ambient = css.slice(css.indexOf("Ambient light"));

describe("the light is decoration only", () => {
  it("spotlight: hidden from assistive tech, takes no pointer, offers nothing to focus", () => {
    const html = renderToStaticMarkup(<HeroSpotlight />);
    expect(html).toMatch(/^<div aria-hidden="true" class="[^"]*pointer-events-none/);
    expect(html).not.toMatch(/<(a|button|input|select|textarea)\b|tabindex/);
  });

  it("spotlight sits between the photo and the words", () => {
    const hero = DEFAULT_HOME_SECTIONS.filter((s) => s.type === "hero.editorial");
    const html = renderToStaticMarkup(<>{renderSections(hero, [])}</>);
    const photo = html.indexOf("Home hero");
    const light = html.indexOf("spot-light");
    const words = html.indexOf("BAD ERA");
    expect(photo).toBeGreaterThan(-1);
    expect(light).toBeGreaterThan(photo);
    expect(words).toBeGreaterThan(light);
    // The words' layer stacks above the light's.
    expect(html).toMatch(/z-\[5\][\s\S]*z-10/);
  });

  it("header LED: hidden from assistive tech, and the logo is untouched", () => {
    const html = renderToStaticMarkup(<SiteHeader />);
    expect(html).toContain('<span aria-hidden="true" class="glow-line"></span>');
    expect(html).toContain('<span aria-hidden="true" class="glow-spill"></span>');
    expect(ambient).not.toMatch(/img|monogram|logo\b/i);
  });

  it("every ambient element that could cover content ignores the pointer", () => {
    for (const cls of ["glow-line", "glow-spill", "glow-shelf-light", "glow-shelf-rise", "spot-vignette", "spot-grain"]) {
      const rule = ambient.slice(ambient.indexOf(`.${cls} {`));
      expect(rule.slice(0, rule.indexOf("}")), cls).toContain("pointer-events: none");
    }
  });
});

describe("warm white, and still for reduced motion", () => {
  it("uses one light colour — the bone of the palette — and no other", () => {
    expect(ambient).toMatch(/--glow:\s*244 241 234;/);
    // Every colour is the glow token or black (shade), with or without alpha.
    const all = ambient.match(/rgba?\(/g) ?? [];
    const allowed = ambient.match(/rgb\((var\(--glow\)|0 0 0)[\s/)]/g) ?? [];
    expect(all.length).toBeGreaterThanOrEqual(6);
    expect(allowed.length).toBe(all.length);
    expect(ambient).not.toMatch(/#[0-9a-f]{3,8}\b|hsla?\(/i);
  });

  it("breathes slowly — no glow cycles faster than six seconds", () => {
    const durations = [...ambient.matchAll(/animation:\s*glow-breathe\s+([\d.]+)s/g)].map((m) => Number(m[1]));
    expect(durations.length).toBeGreaterThanOrEqual(3);
    for (const seconds of durations) expect(seconds).toBeGreaterThanOrEqual(6);
  });

  it("rests visible, not vanished, when the breathing is switched off", () => {
    for (const cls of ["glow-line", "glow-spill", "glow-shelf-light"]) {
      const rule = ambient.slice(ambient.indexOf(`.${cls} {`));
      expect(rule.slice(0, rule.indexOf("}")), cls).toMatch(/opacity:\s*0\.8\d?;/);
    }
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration: 0\.01ms !important/);
  });

  it("the spotlight script stops for reduced motion, off-screen and hidden tabs, and moves by transform only", () => {
    const source = read("src/components/sections/hero-spotlight.tsx");
    expect(source).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(source).toContain("IntersectionObserver");
    expect(source).toContain("document.hidden");
    expect(source).toContain("translate3d(");
    expect(source).not.toMatch(/style\.(left|top|width|height|background)/);
  });
});

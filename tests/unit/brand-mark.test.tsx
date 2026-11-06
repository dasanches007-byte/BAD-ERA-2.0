import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import { renderSections } from "@/components/sections/render";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import {
  BrandMark,
  PRIMARY_ARTWORK,
  SECONDARY_ARTWORK,
  SecondaryBrandMark,
} from "@/components/ui/logo";
import { DEFAULT_HOME_SECTIONS } from "@/lib/cms/default-home";
import { SECTION_REGISTRY } from "@/lib/cms/registry";
import { heroShowsBrandMark, type Section } from "@/lib/cms/sections";

/**
 * The BAD ERA identity, owner-approved amendment of 5 November 2026
 * (brand/logo/README.md): PRIMARY is the full BAD ERA lockup, SECONDARY is
 * BAD alone. The B–E monogram is retired.
 *
 * What must stay true: the site serves the owner's artwork byte for byte; the
 * BAD master is exactly the file approved before (it was demoted, not
 * re-exported); both marks are images, never type; proportions hold at every
 * size; the header carries BAD and the hero the full lockup (owner, 6 Nov).
 */

vi.mock("next/image", () => ({
  default: (props: { alt: string; width: number; height: number; className?: string; src: unknown }) => {
    // Vitest resolves a PNG import to its path, which says which artwork drew.
    const src = typeof props.src === "string" ? props.src : "unknown";
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} width={props.width} height={props.height} className={props.className} src={src} />;
  },
}));

const ROOT = join(__dirname, "..", "..");
const bytes = (path: string) => readFileSync(join(ROOT, path));
const sha256 = (path: string) => createHash("sha256").update(bytes(path)).digest("hex");

const PRIMARY_WHITE = "brand/logo/primary-full-BAD-ERA/BAD-ERA-primary-white-transparent.png";
const PRIMARY_BLACK = "brand/logo/primary-full-BAD-ERA/BAD-ERA-primary-black-transparent.png";
const SECONDARY_WHITE = "brand/logo/secondary-BAD/BAD-secondary-white-transparent.png";
const SECONDARY_BLACK = "brand/logo/secondary-BAD/BAD-secondary-black-transparent.png";

/** Width and height from a PNG's IHDR chunk. */
function pngSize(path: string): { width: number; height: number } {
  const file = bytes(path);
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}

/** First column holding ink (alpha over half). */
async function inkLeft(path: string): Promise<number> {
  const { data, info } = await sharp(join(ROOT, path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let x = 0; x < info.width; x++) {
    for (let y = 0; y < info.height; y++) {
      if (data[(y * info.width + x) * info.channels + 3] > 128) return x;
    }
  }
  return -1;
}

function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(ROOT, path)).isDirectory() ? files(path) : [path];
  });
}

describe("the artwork", () => {
  it("is served exactly as the owner supplied it", () => {
    expect(bytes("public/brand/bad-era-primary-white.png").equals(bytes(PRIMARY_WHITE))).toBe(true);
    expect(bytes("public/brand/bad-era-primary-black.png").equals(bytes(PRIMARY_BLACK))).toBe(true);
    expect(bytes("public/brand/bad-secondary-white.png").equals(bytes(SECONDARY_WHITE))).toBe(true);
  });

  it("keeps the BAD master exactly as first approved — demoted, never re-exported", () => {
    expect(sha256(SECONDARY_WHITE)).toBe("0fc20e6c9dc42505f916c975802ddcbf76b44384a760f2024a3f1eb9e086436e");
    expect(sha256(SECONDARY_BLACK)).toBe("b731c7b29bc95e765e109df589cc9c03c231710b2cecf4ca9a5aa9bcf2788372");
  });

  it("is described by the sizes and clear space the components use", async () => {
    for (const [path, artwork] of [
      [PRIMARY_WHITE, PRIMARY_ARTWORK],
      [PRIMARY_BLACK, PRIMARY_ARTWORK],
      [SECONDARY_WHITE, SECONDARY_ARTWORK],
      [SECONDARY_BLACK, SECONDARY_ARTWORK],
    ] as const) {
      expect(pngSize(path), path).toEqual({ width: artwork.width, height: artwork.height });
    }
    expect(await inkLeft(PRIMARY_WHITE)).toBe(PRIMARY_ARTWORK.inkLeft);
    expect(await inkLeft(SECONDARY_WHITE)).toBe(SECONDARY_ARTWORK.inkLeft);
  });
});

describe("the marks", () => {
  it.each([
    ["primary", BrandMark, "bad-era-primary-white.png"],
    ["secondary", SecondaryBrandMark, "bad-secondary-white.png"],
  ] as const)("%s: an image of the right artwork, never letters set in a font", (_name, Mark, file) => {
    const html = renderToStaticMarkup(<Mark />);
    expect(html).toMatch(new RegExp(`<img alt="BAD ERA"[^>]*src="[^"]*${file.replace(".", "\\.")}"`));
    expect(html).not.toMatch(/>\s*(BAD|ERA|BAD ERA)\s*</);
  });

  it("keep their proportions at every size", () => {
    for (const [Mark, artwork] of [
      [BrandMark, PRIMARY_ARTWORK],
      [SecondaryBrandMark, SECONDARY_ARTWORK],
    ] as const) {
      for (const height of [26, 36, 48, 56, 72]) {
        const html = renderToStaticMarkup(<Mark height={height} />);
        const width = Number(html.match(/width="(\d+)"/)?.[1]);
        expect(Math.abs(width / height - artwork.width / artwork.height), String(height)).toBeLessThan(0.05);
      }
    }
  });

  it("cannot be squeezed by a narrow parent", () => {
    // Base styles cap images at max-width: 100%. With a fixed height, a parent
    // narrower than the mark squashed it — measured: the header lockup drew
    // 170x56 instead of 179x56.
    for (const Mark of [BrandMark, SecondaryBrandMark]) {
      expect(renderToStaticMarkup(<Mark />)).toMatch(/class="[^"]*\bmax-w-none\b[^"]*"/);
    }
  });

  it("are never rebuilt from type, SVG or an ERA typed after BAD", () => {
    expect(readFileSync(join(ROOT, "src/components/ui/logo.tsx"), "utf8")).not.toMatch(/font-|<svg|<path/);
    for (const file of files("src").filter((f) => f.endsWith(".tsx"))) {
      expect(readFileSync(join(ROOT, file), "utf8"), file).not.toMatch(/>\s*ERA\s*</);
    }
  });
});

describe("where they appear", () => {
  it("the header carries BAD alone — the owner's choice, with BAD ERA leading the hero", () => {
    const header = renderToStaticMarkup(<SiteHeader />);
    const home = header.match(/<a [^>]*aria-label="BAD ERA — home"[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "";
    expect(home).toMatch(/^<img [^>]*bad-secondary-white\.png[^>]*>$/);
    expect(header).not.toContain("bad-era-primary");
    expect(header).not.toMatch(/>BAD ERA</);
  });

  it("the hero draws the full lockup for the brand name, never typesets it", () => {
    for (const headline of ["BAD ERA", "  bad   era ", ""]) {
      const hero = { ...DEFAULT_HOME_SECTIONS[0], headline } as Section;
      const html = renderToStaticMarkup(<>{renderSections([hero], [])}</>);
      const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "";
      expect(h1, JSON.stringify(headline)).toMatch(/^<img alt="BAD ERA"[^>]*bad-era-primary-white\.png[^>]*>$/);
    }
    expect(heroShowsBrandMark("BAD ERA 00")).toBe(false);
  });

  it("any other hero words are a headline, in the display face, and the logo steps aside", () => {
    const hero = { ...DEFAULT_HOME_SECTIONS[0], headline: "The first chapter" } as Section;
    const html = renderToStaticMarkup(<>{renderSections([hero], [])}</>);
    expect(html).toMatch(/<h1 class="font-display[^"]*">The first chapter<\/h1>/);
    expect(html).not.toContain("bad-era-primary");
  });

  it("the hero logo is still the headline field, so a click edits it", () => {
    const html = renderToStaticMarkup(<>{renderSections([DEFAULT_HOME_SECTIONS[0]], [], { editing: true })}</>);
    expect(html).toMatch(/<h1 data-be-edit="home-hero::headline" data-be-kind="text"[^>]*><img alt="BAD ERA"/);
    const hint = SECTION_REGISTRY["hero.editorial"].fields.find((f) => f.path === "headline");
    expect(hint && "hint" in hint ? hint.hint : "").toMatch(/BAD ERA \(or empty\) shows the logo/);
  });

  it("the footer's brand moment is the full lockup; its sign-off the compact BAD", () => {
    const footer = renderToStaticMarkup(<SiteFooter />);
    const primary = footer.indexOf("bad-era-primary-white.png");
    const secondary = footer.indexOf("bad-secondary-white.png");
    expect(primary).toBeGreaterThan(-1);
    expect(secondary).toBeGreaterThan(primary);
    expect(footer).not.toMatch(/>BAD ERA</);
  });

  it("the retired monogram is used nowhere", () => {
    for (const file of files("src").filter((f) => /\.(ts|tsx|css)$/.test(f))) {
      expect(readFileSync(join(ROOT, file), "utf8"), file).not.toMatch(/bad-era-monogram|\bMonogram\b/);
    }
    expect(readdirSync(join(ROOT, "public/brand"))).not.toContain("bad-era-monogram.png");
  });
});

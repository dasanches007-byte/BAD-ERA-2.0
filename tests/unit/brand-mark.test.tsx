import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { BrandMark, MARK_SIZE } from "@/components/ui/logo";

/**
 * The official BAD mark (approved 5 November 2026) replaced the B–E monogram.
 *
 * What must stay true: the site serves the owner's artwork byte for byte,
 * never a re-exported, cropped or redrawn copy; it is always an image, never
 * letters set in a font; its width follows its height; and the retired
 * monogram appears nowhere a customer or the owner can see.
 */

vi.mock("next/image", () => ({
  default: (props: { alt: string; width: number; height: number; className?: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} width={props.width} height={props.height} className={props.className} src="/mark.png" />;
  },
}));

const ROOT = join(__dirname, "..", "..");
const bytes = (path: string) => readFileSync(join(ROOT, path));

/** Width and height from a PNG's IHDR chunk. */
function pngSize(path: string): { width: number; height: number } {
  const file = bytes(path);
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}

function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(ROOT, path)).isDirectory() ? files(path) : [path];
  });
}

describe("the BAD mark", () => {
  it("is served exactly as the owner supplied it", () => {
    expect(bytes("public/brand/bad-primary-white.png").equals(bytes("brand/logo/BAD-primary-white-transparent.png"))).toBe(
      true,
    );
    expect(pngSize("brand/logo/BAD-primary-white-transparent.png")).toEqual(MARK_SIZE);
    expect(pngSize("brand/logo/BAD-primary-black-transparent.png")).toEqual(MARK_SIZE);
  });

  it("is an image, never letters set in a font", () => {
    const html = renderToStaticMarkup(<BrandMark />);
    expect(html).toMatch(/<img alt="BAD ERA"/);
    expect(html).not.toMatch(/>\s*BAD\s*</);
    expect(readFileSync(join(ROOT, "src/components/ui/logo.tsx"), "utf8")).not.toMatch(/font-|<svg|<path/);
  });

  it("keeps its proportions at every size", () => {
    for (const height of [26, 30, 40, 60]) {
      const html = renderToStaticMarkup(<BrandMark height={height} />);
      const width = Number(html.match(/width="(\d+)"/)?.[1]);
      expect(Math.abs(width / height - MARK_SIZE.width / MARK_SIZE.height), String(height)).toBeLessThan(0.05);
    }
  });

  it("is the logo in the header and the footer, and the only one", () => {
    const header = renderToStaticMarkup(<SiteHeader />);
    expect(header).toMatch(/<a [^>]*aria-label="BAD ERA — home"[^>]*><img alt="BAD ERA"/);
    // The words beside the old monogram would now read "BAD BAD ERA".
    expect(header).not.toMatch(/>BAD ERA</);
    expect(renderToStaticMarkup(<SiteFooter />)).toContain('<img alt="BAD ERA"');
  });

  it("the retired monogram is used nowhere", () => {
    const sources = files("src").filter((f) => /\.(ts|tsx|css)$/.test(f));
    for (const file of sources) {
      expect(readFileSync(join(ROOT, file), "utf8"), file).not.toMatch(/bad-era-monogram|\bMonogram\b/);
    }
    expect(readdirSync(join(ROOT, "public/brand"))).not.toContain("bad-era-monogram.png");
  });
});

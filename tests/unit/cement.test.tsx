import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { renderSections } from "@/components/sections/render";
import { editablePageView } from "@/components/studio/editable-page";
import { CartButton } from "@/components/storefront/header-buttons";
import { Poster, posterLines, posterLineWidth, posterText } from "@/components/ui/poster";
import { bagWordsOf } from "@/lib/cart/bag-types";
import type { CatalogProduct, CatalogVariant } from "@/lib/catalog/queries";
import { DEFAULT_HOME_SECTIONS } from "@/lib/cms/default-home";
import {
  chromeFrom,
  DEFAULT_PRODUCT_WORDING,
  DEFAULT_SHOP_CATALOG,
  DEFAULT_SITE_BAG,
  TEMPLATE_DEFAULTS,
} from "@/lib/cms/default-pages";
import { CHROME_TEMPLATE } from "@/lib/cms/edit-targets";
import { parseSection, SECTION_REGISTRY } from "@/lib/cms/registry";
import type { Section } from "@/lib/cms/sections";

/**
 * The cement design, owner-approved 12 November 2026: the owner's cement in
 * two tones, one loud condensed voice, a bag that slides in, and product
 * photos the customer can zoom into. (The zoom replaced the product page's
 * movable light the same day, at the owner's request.)
 *
 * What must stay true:
 *   - the look is fixed; Studio edits words and photos, and whatever the
 *     owner writes still fits (a poster is sized to its words, never by a
 *     control);
 *   - there is no colour in the design: the surfaces are the cement, and a
 *     photo is only ever shown as it is, larger;
 *   - every new word is the owner's to change, and content saved before the
 *     design still reads;
 *   - the bag shows what the server worked out and sends back only a variant;
 *   - the zoom keeps the keyboard and the page in order, and the motion is
 *     decoration: still under reduced motion, absent without script, never in
 *     the way of a click.
 */

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: unknown; className?: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} className={props.className} src={typeof props.src === "string" ? props.src : "/img.png"} />;
  },
}));

const ROOT = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);
const marks = (markup: string) => [...markup.matchAll(/data-be-edit="([^"]*)"/g)].map((m) => m[1]);
const words = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const lines = (text: string, wrapAt?: number) =>
  posterLines(text, wrapAt).map((line) => line.map((word) => word.text).join(" "));

function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(ROOT, path)).isDirectory() ? files(path) : [path];
  });
}

function variant(id: string, options: Record<string, string>, sellable: number | null): CatalogVariant {
  return {
    id,
    title: Object.values(options).join(" / ") || "Default",
    sku: null,
    priceCents: 6800,
    compareAtPriceCents: null,
    currency: "USD",
    position: 0,
    isDefault: false,
    inventoryMode: "stocked",
    isBundle: false,
    sellableQuantity: sellable,
    stockState: sellable === 0 ? "sold_out" : "in_stock",
    purchasable: sellable === null || sellable > 0,
    options,
  };
}

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "p1",
    handle: "era-tee",
    title: "ERA Tee",
    subtitle: null,
    description: null,
    productType: null,
    tags: [],
    status: "active",
    kind: "standard",
    seoTitle: null,
    seoDescription: null,
    variants: [variant("v1", {}, 5)],
    photos: [],
    soldOut: false,
    ...overrides,
  };
}

describe("the poster voice", () => {
  it("breaks the approved lines the approved way, by itself", () => {
    expect(lines("Dress like you run it.")).toEqual(["Dress", "like you", "run it."]);
    expect(lines("Confidence looks *good* on you.")).toEqual(["Confidence", "looks good", "on you."]);
    expect(lines("Featured drops")).toEqual(["Featured", "drops"]);
    expect(lines("BAD ERA")).toEqual(["BAD ERA"]);
  });

  it("keeps a line break the owner typed, and never splits a word", () => {
    expect(lines("Dress like\nyou run it.")).toEqual(["Dress like", "you run it."]);
    expect(lines("Internationally known")).toEqual(["Internationally", "known"]);
    // A hand-broken line much too long for the column is still broken.
    expect(lines("One\nthis line is far too long to stay whole")).toEqual([
      "One",
      "this line",
      "is far too",
      "long to",
      "stay whole",
    ]);
    expect(lines("  spaced    out   \n\n words ")).toEqual(["spaced out", "words"]);
  });

  it("picks out a word between stars, and leaves a lone star alone", () => {
    const picked = posterLines("Confidence looks *good* on you.").flat();
    expect(picked.filter((w) => w.em).map((w) => w.text)).toEqual(["good"]);
    expect(posterText("Confidence looks *good* on you.")).toBe("Confidence looks good on you.");
    expect(posterLines("Rated 5* by you").flat().some((w) => w.em)).toBe(false);
    expect(posterText("Rated 5* by you")).toBe("Rated 5* by you");
  });

  it("is sized to its widest line, so wide letters set smaller rather than run off the page", () => {
    const width = (text: string) => posterLineWidth(posterLines(text, 99)[0]);
    // An M is about three I's in this face: counting letters would not do.
    expect(width("MMMM")).toBeGreaterThan(width("IIII") * 2.5);
    expect(width("crossbody")).toBeCloseTo(width("CROSSBODY"), 5);
    // Measured in the browser: CROSSBODY sets 4.33em wide.
    expect(width("CROSSBODY")).toBeGreaterThan(4.3);
    expect(width("CROSSBODY")).toBeLessThan(4.45);
    // Anything unmeasured counts as wide, never as nothing.
    expect(width("É")).toBeGreaterThan(0.6);

    const markup = html(<Poster text={"Womenswear\nnow"} />);
    const w = Number(markup.match(/--w:([\d.]+)/)?.[1]);
    expect(w).toBeCloseTo(width("WOMENSWEAR"), 2);
    expect(markup).toContain("--l:2");
  });

  it("is a heading whose words read as one sentence", () => {
    const markup = html(<Poster as="h2" text="Confidence looks *good* on you." />);
    expect(markup).toMatch(/<h2 class="poster poster-fit"/);
    expect(words(markup)).toBe("Confidence looks good on you.");
    expect(markup).toContain("<em>good</em>");
  });

  it("takes nothing from its text but the words: no size, face or colour", () => {
    const markup = html(<Poster text={'<b style="color:red">Big</b> font-size:900px'} />);
    expect(markup).not.toContain("<b ");
    expect(markup).not.toMatch(/style="[^"]*(color|font)/);
    expect(markup).toContain("&lt;b");
  });
});

describe("no colour in the design", () => {
  const css = read("src/app/globals.css");
  const cement = css.slice(css.indexOf("The cement system"));

  it("the cement styles use only the palette: cement, pale cement, bone, black, and shade", () => {
    // Every literal colour in the cement section is a neutral: equal-ish
    // channels. A hue would have to be written here to appear on the site.
    const literals = [...cement.matchAll(/rgb\((\d+) (\d+) (\d+)/g)].map((m) => m.slice(1, 4).map(Number));
    expect(literals.length).toBeGreaterThan(10);
    for (const [r, g, b] of literals) {
      expect(Math.max(r, g, b) - Math.min(r, g, b), `rgb(${r} ${g} ${b})`).toBeLessThanOrEqual(12);
    }
    expect(cement).not.toMatch(/#[0-9a-f]{3,8}\b(?<!#0b0b0a)/i);
    expect(cement).not.toMatch(/hsl|oklch|hue-rotate/);
  });

  it("the textures are the owner's cement, served from the brand folder", () => {
    for (const file of ["cement.webp", "cement-wide.webp", "pale.webp", "pale-wide.webp"]) {
      expect(statSync(join(ROOT, "public/brand/texture", file)).size, file).toBeGreaterThan(10_000);
      expect(cement).toContain(`/brand/texture/${file}`);
    }
    expect(statSync(join(ROOT, "brand/texture/cement-owner-supplied.jpg")).size).toBeGreaterThan(10_000);
  });

  it("a zoomed photo is the owner's photo and nothing else: no filter, tint or overlay", () => {
    const zoom = read("src/components/storefront/photo-zoom.tsx");
    expect(zoom).not.toMatch(/filter:|mixBlend|mix-blend|<canvas|getContext|gradient/);
    const css = read("src/app/globals.css");
    const rules = css.slice(css.indexOf("/* The zoom:"), css.indexOf("/* --- The buy bar"));
    expect(rules).not.toMatch(/filter:|mix-blend|gradient/);
  });

  it("the retired lights are gone: the underglow, the spotlight and the product page's light", () => {
    expect(css).not.toMatch(/glow-line|glow-shelf|glow-spill|spot-light|--glow\b|\.lit\b|lit-hint/);
    for (const file of files("src").filter((f) => /\.(ts|tsx)$/.test(f))) {
      expect(read(file), file).not.toMatch(/glow-shelf|glow-line|HeroSpotlight|LitPhoto|lightHint|WebGL/);
    }
  });
});

describe("every section says which cement it is, so the header can follow", () => {
  it("on the homepage, the Shop page and the product page", () => {
    const home = html(renderSections(DEFAULT_HOME_SECTIONS, [product(), product({ id: "p2", handle: "b" })]));
    const tones = [...home.matchAll(/<section [^>]*data-tone="(dark|light)"/g)].map((m) => m[1]);
    expect(tones.length).toBeGreaterThanOrEqual(4);
    expect(tones).toContain("light");
    expect(tones[0]).toBe("dark");

    expect(html(renderSections([DEFAULT_SHOP_CATALOG], []))).toMatch(/<section [^>]*data-tone="light"/);
    const pdp = html(renderSections([DEFAULT_PRODUCT_WORDING], [], { product: product() }));
    expect(pdp).toMatch(/class="stage"[^>]*data-tone="dark"/);
    expect(pdp).toMatch(/<section [^>]*class="pale[^"]*"[^>]*data-tone="light"/);
  });

  it("the header shows the right mark before any script runs", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/:has\(#main-content > \[data-tone="light"\]:first-child\) \.site-head:not\(\[data-tone\]\)/);
  });
});

describe("the bag", () => {
  it("is the owner's wording: every word in it and on the buy buttons has a field", () => {
    const fields = SECTION_REGISTRY["site.bag"].fields.map((f) => f.path).sort();
    expect(fields).toEqual(Object.keys(bagWordsOf(DEFAULT_SITE_BAG)).sort());
    expect(SECTION_REGISTRY["site.bag"].alwaysShown).toBe(true);
    for (const field of SECTION_REGISTRY["site.bag"].fields) {
      expect(["text", "textarea"]).toContain(field.kind);
    }
    expect(parseSection(DEFAULT_SITE_BAG).success).toBe(true);
    expect(TEMPLATE_DEFAULTS[CHROME_TEMPLATE]).toContain(DEFAULT_SITE_BAG);
  });

  it("promises nothing about shipping the store has not configured", () => {
    expect(DEFAULT_SITE_BAG.shippingNote).toBe(
      "Flat-rate shipping and any applicable tax are calculated at checkout.",
    );
    expect(JSON.stringify(DEFAULT_SITE_BAG)).not.toMatch(/free shipping|\$\d|days?\b/i);
  });

  it("can be edited word by word on the Menu & footer page, and is never drawn for customers", () => {
    const editing = html(
      editablePageView({
        templateKey: CHROME_TEMPLATE,
        sections: TEMPLATE_DEFAULTS[CHROME_TEMPLATE],
        products: [],
        chrome: chromeFrom(null),
        editing: true,
      }),
    );
    for (const path of Object.keys(bagWordsOf(DEFAULT_SITE_BAG))) {
      expect(marks(editing), path).toContain(`site-bag::${path}`);
    }
    expect(html(renderSections([DEFAULT_SITE_BAG], []))).toBe("");
  });

  it("the header's Cart is a real link, so it works before any script and in the editors", () => {
    expect(html(<CartButton />)).toMatch(/^<a [^>]*href="\/cart"[^>]*>Cart<\/a>$/);
  });

  it("sends the server a variant and nothing else: never a price, never a total", () => {
    const shell = read("src/components/storefront/storefront-shell.tsx");
    expect(shell).toMatch(/addToCartAction\(variantId, 1\)/);
    expect(shell).toMatch(/updateCartLineAction\(line\.itemId, next\)/);
    for (const file of ["storefront-shell.tsx", "add-to-bag.tsx", "product-detail.tsx", "header-buttons.tsx"]) {
      const source = read(`src/components/storefront/${file}`);
      // Money is shown from what the server returned, never added up here.
      expect(source, file).not.toMatch(/reduce\([^)]*Cents|Cents\s*[*+]\s*|\*\s*line\.quantity/);
    }
    const actions = read("src/lib/cart/actions.ts");
    expect(actions).toMatch(/export async function addToCartAction\(\s*variantId: string,\s*quantity = 1,?\s*\)/);
  });

  it("reads the bag without creating a cart, and a failed read is an empty bag", () => {
    const bag = read("src/lib/cart/bag.ts");
    expect(bag).toMatch(/^import "server-only";/);
    expect(bag).toMatch(/resolveExistingCartId\(\)/);
    expect(bag).not.toMatch(/resolveCart\(/);
    expect(bag).toMatch(/return EMPTY_BAG;\s*}\s*}\s*$/);
  });
});

describe("content saved before the design still reads", () => {
  it("an older photo story has no heading and a hidden button", () => {
    const story = DEFAULT_HOME_SECTIONS.find((s) => s.type === "editorial.story_grid") as Record<string, unknown>;
    const { heading: _heading, cta: _cta, ...older } = story;
    void _heading;
    void _cta;
    const parsed = parseSection(older);
    expect(parsed.success).toBe(true);
    const section = parsed.data as Extract<Section, { type: "editorial.story_grid" }>;
    expect(section.heading).toBe("");
    expect(section.cta.enabled).toBe(false);
    // And draws exactly what it had: the photos, no poster, no button.
    const markup = html(renderSections([section], []));
    expect(markup).not.toContain("poster-fit");
    expect(markup).not.toContain('class="pill');
  });

  it("wording saved with the light's hints simply loses them", () => {
    const withLight = {
      ...DEFAULT_PRODUCT_WORDING,
      lightHintTouch: "Press and hold, then drag the light",
      lightHintMouse: "Move the cursor to move the light",
    };
    const parsed = parseSection(withLight);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual(DEFAULT_PRODUCT_WORDING);
  });

  it("older product page wording gains the new words at their shipped values", () => {
    const { backLabel: _b, zoomHintTouch: _t, zoomHintMouse: _m, ...older } = DEFAULT_PRODUCT_WORDING;
    void _b;
    void _t;
    void _m;
    const parsed = parseSection(older);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual(DEFAULT_PRODUCT_WORDING);
  });

  it("a draft that predates the bag's wording is topped up, not left without it", () => {
    const pages = read("src/lib/cms/pages.ts");
    expect(pages).toMatch(/const missing = defaults\.filter\(\(section\) => !present\.has\(section\.sectionId\)\)/);
    expect(pages).toMatch(/ignoreDuplicates: true/);
  });
});

describe("a piece in a line-up", () => {
  const card = (p: CatalogProduct) => html(renderSections([DEFAULT_SHOP_CATALOG], [p]));

  it("with nothing to choose can be added where it stands", () => {
    const markup = card(product());
    expect(markup).toMatch(/<button [^>]*aria-label="Add to bag: ERA Tee"[^>]*>Add to bag<\/button>/);
    expect(markup).toMatch(/in stock/i);
  });

  it("with sizes sends the customer to choose, rather than guessing one", () => {
    const sized = product({ variants: [variant("s", { Size: "S" }, 2), variant("m", { Size: "M" }, 2)] });
    const markup = card(sized);
    expect(markup).toMatch(/<a [^>]*href="\/products\/era-tee"[^>]*>Choose options<\/a>/);
    expect(markup).not.toMatch(/<button [^>]*>Add to bag/);
  });

  it("sold out says so once, on a button that cannot be pressed", () => {
    const gone = product({ variants: [variant("v", {}, 0)], soldOut: true });
    const markup = card(gone);
    expect(markup).toMatch(/<button [^>]*disabled=""[^>]*>Sold out<\/button>/);
    expect(markup.match(/sold out/gi)?.length).toBe(1);
  });

  it("takes its price from the catalog and its photo from the product, never from wording", () => {
    const markup = card(product());
    expect(markup).toContain("$68");
    expect(JSON.stringify(DEFAULT_SHOP_CATALOG)).not.toContain("$");
  });
});

describe("the product page", () => {
  const withPhoto = product({
    title: "ERA 00 Tee",
    description: "Heavy cotton.",
    variants: [variant("s", { Size: "S" }, 4), variant("l", { Size: "L" }, 0)],
    photos: [
      { url: "/a.jpg", alt: "Close-up of the tee", focal: { x: 0.5, y: 0.4 }, variantId: null },
      { url: "/b.jpg", alt: "Worn", focal: { x: 0.5, y: 0.5 }, variantId: null },
    ],
  });
  const page = html(renderSections([DEFAULT_PRODUCT_WORDING], [], { product: withPhoto }));

  it("shows the photos plainly, each with its own description, first one leading", () => {
    expect(page).toMatch(/<section class="stage" data-tone="dark">[\s\S]*?<img alt="Close-up of the tee"[^>]*src="\/a\.jpg"/);
    expect(page).toMatch(/aria-label="More photos of ERA 00 Tee"[\s\S]*<img alt="Worn"[^>]*src="\/b\.jpg"/);
    expect(page).not.toContain("<canvas");
  });

  it("a product with no photo yet has an empty stage, not a broken one", () => {
    const bare = html(renderSections([DEFAULT_PRODUCT_WORDING], [], { product: product() }));
    expect(bare).toMatch(/class="stage"[^>]*aria-label="ERA Tee: no photo yet"/);
    expect(bare).not.toContain("zoom-open");
  });

  it("offers the zoom only where there is a shop to zoom in: never in the editors", () => {
    // Outside the public layout (the editors, this test) nothing opens, so
    // the photos carry no zoom button and stay out of the owner's way.
    expect(page).not.toContain("zoom-open");
    const detail = read("src/components/storefront/product-detail.tsx");
    expect(detail).toMatch(/const zoomable = shop\.interactive;/);
    expect(detail.match(/\{zoomable \? \(\s*<button\s+type="button"\s+className="zoom-open"\s+aria-label="Zoom in on this photo"/g)?.length).toBe(2);
  });

  it("keeps a sold-out size legible but not pressable, and names the piece once as the heading", () => {
    expect(page).toMatch(/<button [^>]*disabled=""[^>]*aria-label="L, sold out"/);
    expect(page.match(/<h1/g)?.length).toBe(1);
    expect(words(page.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? "")).toBe("ERA 00 Tee");
  });

  it("holds Add to bag at the foot of a phone, out of the way until it is needed", () => {
    expect(page).toMatch(/<div class="buybar" inert="">/);
    expect(read("src/app/globals.css")).toMatch(/@media \(max-width: 1023px\) \{\s*\.buybar \{\s*display: flex;/);
  });

  it("the owner's new words are all one click away", () => {
    const editing = html(renderSections([DEFAULT_PRODUCT_WORDING], [], { editing: true, product: withPhoto }));
    for (const path of ["backLabel", "zoomHintTouch", "zoomHintMouse", "detailsHeading", "note"]) {
      expect(marks(editing), path).toContain(`product-wording::${path}`);
    }
  });
});

describe("zooming into a photo", () => {
  const zoom = read("src/components/storefront/photo-zoom.tsx");
  const css = read("src/app/globals.css");

  it("opens where it was touched, and whole from the keyboard", () => {
    const detail = read("src/components/storefront/product-detail.tsx");
    // A key press carries no place on the screen (event.detail is 0).
    expect(detail).toMatch(/at: event\.detail === 0 \? null : \{ x: event\.clientX, y: event\.clientY \}/);
    expect(zoom).toMatch(/if \(origin && start\.at\) \{/);
    // Always closer than it was on the page, and never past the limit.
    expect(zoom).toMatch(/const z = clamp\(Math\.max\(TAP_ZOOM, home\.z \* 1\.4\), 1, MAX_ZOOM\);/);
  });

  it("never lets the photo's edge come in past the screen's, and never zooms past its limits", () => {
    expect(zoom).toMatch(/const maxX = Math\.max\(0, \(bw \* next\.z - vw\) \/ 2\);/);
    expect(zoom).toMatch(/const to = clamp\(z, 1, MAX_ZOOM\);/);
    expect(zoom).toMatch(/const MAX_ZOOM = 4;/);
  });

  it("holds the page and the keyboard while open, and gives both back", () => {
    expect(zoom).toMatch(/role="dialog"\s+aria-modal="true"/);
    expect(zoom).toMatch(/shop\.holdPage\(true\);[\s\S]*?return \(\) => shop\.holdPage\(false\);/);
    expect(zoom).toMatch(/if \(e\.key === "Escape"\) \{\s*e\.preventDefault\(\);\s*close\(\);/);
    expect(zoom).toMatch(/Keep the keyboard inside while the zoom is open/);
    const shell = read("src/components/storefront/storefront-shell.tsx");
    expect(shell).toMatch(/const covered = open !== null \|\| held;/);
    expect(shell).toMatch(/inert=\{interactive && covered\}/);
    const detail = read("src/components/storefront/product-detail.tsx");
    expect(detail).toMatch(/if \(back\?\.isConnected\) back\.focus\(\{ preventScroll: true \}\);/);
  });

  it("can be worked without a pointer: every action has a key and a labelled button", () => {
    for (const label of ["Close zoom", "Zoom in", "Zoom out", "Previous photo", "Next photo"]) {
      expect(zoom, label).toContain(`aria-label="${label}"`);
    }
    for (const key of ['"+"', '"-"', '"0"', '"ArrowLeft"', '"ArrowUp"', '"Escape"']) {
      expect(zoom, key).toContain(`e.key === ${key}`);
    }
  });

  it("takes over touches only inside the zoom: the page still scrolls under a finger on the photo", () => {
    expect(css).toMatch(/\.zoom-surface \{[^}]*touch-action: none;/);
    // The photo on the page is an ordinary button: no touch handling, so a
    // swipe that starts on it scrolls the page as it would anywhere.
    expect(css).not.toMatch(/\.zoom-open \{[^}]*touch-action/);
    expect(css).not.toMatch(/\.stage \{[^}]*touch-action/);
  });

  it("shows the copy already on screen first, then the largest there is", () => {
    expect(zoom).toMatch(/sizes="\(min-width: 1024px\) 53vw, 100vw"/);
    expect(zoom).toMatch(/sizes="300vw"\s+className="zoom-sharp object-contain"/);
    expect(css).toMatch(/\.zoom-sharp \{\s*opacity: 0;/);
    expect(css).toMatch(/\.zoom-sharp\[data-loaded\] \{\s*opacity: 1;/);
  });
});

describe("the motion is decoration", () => {
  const effects = read("src/components/storefront/site-effects.tsx");

  it("posters rise only for a visitor who has not asked for stillness, and never while editing", () => {
    expect(effects).toMatch(/if \(!reduce\.matches && !editing && typeof IntersectionObserver !== "undefined"\)/);
    expect(effects).toMatch(/if \(hero && !reduce\.matches\)/);
    // With no script the words are simply there: the hiding class is added by the script alone.
    for (const file of files("src").filter((f) => f.endsWith(".tsx"))) {
      if (file.endsWith("site-effects.tsx")) continue;
      expect(read(file), file).not.toMatch(/rise-ready/);
    }
  });

  it("under reduced motion nothing travels: every transition is cut short for the whole site", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\*,\s*\*::before,\s*\*::after \{[^}]*transition-duration: 0\.01ms !important;/);
  });

  it("the stitched seam, the shade and the zoom hint never take a click", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/\.stitch \{[^}]*pointer-events: none;/);
    expect(css).toMatch(/\.hero-shade \{[^}]*pointer-events: none;/);
    expect(css).toMatch(/\.stage-hint \{[^}]*pointer-events: none;/);
  });
});

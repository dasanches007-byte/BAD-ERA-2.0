import { readFileSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { renderSections } from "@/components/sections/render";
import { editablePageView, sampleProduct } from "@/components/studio/editable-page";
import { SiteHeader } from "@/components/storefront/site-header";
import type { CatalogProduct } from "@/lib/catalog/queries";
import {
  chromeFrom,
  DEFAULT_PRODUCT_WORDING,
  DEFAULT_SHOP_CATALOG,
  DEFAULT_SITE_FOOTER,
  DEFAULT_SITE_HEADER,
  pickSection,
  TEMPLATE_DEFAULTS,
} from "@/lib/cms/default-pages";
import {
  applyFieldEdit,
  CHROME_TEMPLATE,
  decodeEditTarget,
  PRODUCT_TEMPLATE,
  resolveEditTarget,
  SHOP_TEMPLATE,
} from "@/lib/cms/edit-targets";
import { parseSection, SECTION_REGISTRY, type InspectorField } from "@/lib/cms/registry";
import type { Section, SiteFooterSection, SiteHeaderSection } from "@/lib/cms/sections";

/**
 * Menu & footer, the Shop page and the product page wording, editable in
 * Studio like the homepage.
 *
 * What must stay true: customers see exactly the shipped wording until the
 * owner publishes; nothing is invented (no social handles, no shipping
 * promise); the menu, footer, Shop grid and product page can never be hidden;
 * Account and Cart can never be removed; and every word a customer reads on
 * these pages is one click from its field.
 */

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={typeof props.src === "string" ? props.src : "/logo.png"} />;
  },
}));

const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);
const marks = (markup: string) =>
  [...markup.matchAll(/data-be-edit="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
/** Where the page's links go (anchors only, not the logo's preload hint). */
const hrefs = (markup: string) => [...markup.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]);

const DEFAULTS: Section[] = [
  DEFAULT_SITE_HEADER,
  DEFAULT_SITE_FOOTER,
  DEFAULT_SHOP_CATALOG,
  DEFAULT_PRODUCT_WORDING,
];

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "6f1c3a52-6b8e-4d7c-9a51-0d4f5e2c7b10",
    handle: "bad-era-original-tee",
    title: "BAD ERA Original Tee",
    subtitle: "Black",
    description: "Heavyweight cotton.",
    productType: "Tee",
    tags: ["archive-01"],
    status: "active",
    kind: "standard",
    seoTitle: null,
    seoDescription: null,
    photos: [],
    soldOut: false,
    variants: [
      {
        id: "0b7c2f4e-1d3a-4c5b-8e6f-7a9b0c1d2e3f",
        title: "M",
        sku: null,
        priceCents: 3000,
        compareAtPriceCents: null,
        currency: "usd",
        position: 0,
        isDefault: true,
        inventoryMode: "STOCKED",
        isBundle: false,
        sellableQuantity: 4,
        stockState: "ONLY_A_FEW_LEFT",
        purchasable: true,
        options: { Size: "M" },
      },
    ],
    ...overrides,
  } as CatalogProduct;
}

const link = (label: string, href: string, enabled = true) => ({ link: { label, href, enabled } });

// --- The shipped wording ------------------------------------------------------

describe("starting content", () => {
  it("is valid against the registry, every template's defaults included", () => {
    for (const section of DEFAULTS) {
      expect(parseSection(section).success, section.type).toBe(true);
    }
    expect(Object.keys(TEMPLATE_DEFAULTS).sort()).toEqual(
      [CHROME_TEMPLATE, PRODUCT_TEMPLATE, SHOP_TEMPLATE].sort(),
    );
  });

  it("is the wording the site already shipped with, so publishing nothing changes nothing", () => {
    const header = html(<SiteHeader />);
    expect(hrefs(header)).toEqual(["/", "/shop", "/about", "/account", "/cart", "/shop", "/about"]);

    const footer = html(renderSections([DEFAULT_SITE_FOOTER], []));
    for (const words of [
      "A California based brand built on authenticity, purpose, and progression. This is not a trend. This is a movement.",
      "Be the first to know about drops, new releases, and exclusive access.",
      "Based in California",
    ]) {
      expect(footer).toContain(words);
    }
    expect(hrefs(footer)).toEqual(["/shop", "/shop", "/about", "/shipping", "/returns-policy", "/support", "/privacy", "/terms"]);

    const shop = html(renderSections([DEFAULT_SHOP_CATALOG], []));
    expect(shop).toContain("All products");
    expect(shop).toContain("Products appear here as soon as they are published from BAD ERA Studio.");

    const pdp = html(renderSections([DEFAULT_PRODUCT_WORDING], [], { product: product() }));
    expect(pdp).toContain("Archive 01");
    expect(pdp).toContain("Details");
    expect(pdp).toContain("Limited quantities. Never restocked.");
  });

  it("invents nothing: no social handles, no shipping promise, no future-module links", () => {
    expect(DEFAULT_SITE_FOOTER.socialLinks).toEqual([]);
    expect(DEFAULT_PRODUCT_WORDING.note).toBe("");
    const footer = html(renderSections([DEFAULT_SITE_FOOTER], []));
    expect(footer).not.toContain("Follow");
    expect(footer).not.toMatch(/instagram|tiktok|twitter|facebook/i);
    const header = html(<SiteHeader />);
    expect(header).not.toMatch(/lookbook|era-00/i);
  });
});

// --- Always shown -------------------------------------------------------------

describe("the menu, footer, Shop grid and product page cannot be hidden", () => {
  it("is declared in the registry", () => {
    for (const type of ["site.header", "site.footer", "shop.catalog", "product.wording"] as const) {
      expect(SECTION_REGISTRY[type].alwaysShown, type).toBe(true);
    }
  });

  it("renders even if a stored section says hidden", () => {
    const hidden = { ...DEFAULT_SITE_HEADER, enabled: false };
    expect(pickSection([hidden], "site.header", DEFAULT_SITE_HEADER).enabled).toBe(true);
    expect(chromeFrom([hidden]).header.enabled).toBe(true);
    expect(html(renderSections([chromeFrom([hidden]).header], []))).toContain("<header");
  });

  it("falls back to the shipped menu and footer when there is nothing published", () => {
    expect(chromeFrom(null)).toEqual({ header: DEFAULT_SITE_HEADER, footer: DEFAULT_SITE_FOOTER });
    const ownMenu = { ...DEFAULT_SITE_HEADER, links: [link("Archive", "/shop")] };
    expect(chromeFrom([ownMenu]).header.links).toEqual(ownMenu.links);
    expect(chromeFrom([ownMenu]).footer).toEqual(DEFAULT_SITE_FOOTER);
  });

  it("keeps Account and Cart, and the logo, whatever the menu says", () => {
    const empty: SiteHeaderSection = { ...DEFAULT_SITE_HEADER, links: [] };
    const markup = html(<SiteHeader section={empty} />);
    expect(hrefs(markup)).toEqual(["/", "/account", "/cart"]);
    expect(markup).toContain('aria-label="BAD ERA — home"');
  });
});

// --- Links --------------------------------------------------------------------

describe("menu and footer links", () => {
  const header: SiteHeaderSection = {
    ...DEFAULT_SITE_HEADER,
    links: [link("Shop", "/shop"), link("Lookbook", "/lookbook", false), link("", "/about"), link("Journal", "https://journal.example")],
  };

  it("shows customers only links that are on and have words", () => {
    const markup = html(<SiteHeader section={header} />);
    expect(markup).not.toContain("Lookbook");
    expect(markup).not.toContain("New link");
    expect(markup).not.toContain("data-be-");
    expect(hrefs(markup).filter((h) => h === "/about")).toEqual([]);
  });

  it("opens another site in a new tab, telling it nothing about the page", () => {
    const markup = html(<SiteHeader section={header} />);
    expect(markup).toMatch(/<a [^>]*href="https:\/\/journal\.example"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  });

  it("shows hidden and unnamed links to the owner as stand-ins, still clickable", () => {
    const markup = html(<SiteHeader section={header} editing />);
    expect(markup).toContain("Lookbook · hidden");
    expect(markup).toContain("+ New link");
    expect(marks(markup)).toContain("site-header::links.1.link");
    expect(marks(markup)).toContain("site-header::links.2.link");
  });

  it("wraps on a phone rather than squeezing into a sideways strip", () => {
    const markup = html(<SiteHeader section={header} />);
    expect(markup).toMatch(/aria-label="Primary mobile"[\s\S]*flex-wrap/);
  });

  it("refuses a destination that is not a site path or a web address", () => {
    for (const href of ["javascript:alert(1)", "//evil.example", "data:text/html,x"]) {
      const bad = { ...DEFAULT_SITE_HEADER, links: [link("x", href)] };
      expect(parseSection(bad).success, href).toBe(false);
    }
  });
});

// --- Lists the owner manages --------------------------------------------------

const managedLists = Object.values(SECTION_REGISTRY).flatMap((definition) =>
  definition.fields
    .filter((f): f is Extract<InspectorField, { kind: "repeater" }> => f.kind === "repeater" && Boolean(f.newItem))
    .map((field) => ({ type: definition.type, field })),
);

describe("lists the owner manages (menu, footer and social links)", () => {
  it("are exactly the link lists", () => {
    expect(managedLists.map(({ type, field }) => `${type}.${field.path}`).sort()).toEqual([
      "site.footer.infoLinks",
      "site.footer.shopLinks",
      "site.footer.socialLinks",
      "site.header.links",
    ]);
  });

  it.each(managedLists.map(({ type, field }) => [`${type}.${field.path}`, type, field] as const))(
    "%s: a new item saves, and the inspector's limit is the schema's",
    (_name, type, field) => {
      const base = DEFAULTS.find((s) => s.type === type)!;
      const items = (n: number) => Array.from({ length: n }, () => structuredClone(field.newItem));
      expect(parseSection({ ...base, [field.path]: items(1) }).success).toBe(true);
      expect(parseSection({ ...base, [field.path]: items(field.max) }).success).toBe(true);
      expect(parseSection({ ...base, [field.path]: items(field.max + 1) }).success).toBe(false);
    },
  );

  it("open as a whole list, from any one link or from the empty stand-in", () => {
    const resolved = resolveEditTarget(DEFAULT_SITE_HEADER, "links.0.link");
    expect(resolved?.field.kind).toBe("cta");
    expect(resolved?.listPath).toBe("links");
    expect(resolveEditTarget(DEFAULT_SITE_HEADER, "links")?.field.kind).toBe("repeater");
    expect(resolveEditTarget(DEFAULT_SITE_FOOTER, "socialLinks")?.label).toBe("Social links");
  });

  it("a fixed set (the three story tiles) still opens one item, never the set", () => {
    const tiles = { type: "editorial.story_grid" } as const;
    expect(SECTION_REGISTRY[tiles.type].fields.find((f) => f.path === "tiles")).not.toHaveProperty("newItem");
  });

  it("an edit to the whole list replaces it, and only it", () => {
    const next = applyFieldEdit(DEFAULT_SITE_HEADER, "links", [link("Shop", "/shop")]) as SiteHeaderSection;
    expect(next.links).toEqual([link("Shop", "/shop")]);
    expect(next.sectionId).toBe(DEFAULT_SITE_HEADER.sectionId);
    expect(DEFAULT_SITE_HEADER.links).toHaveLength(2);
  });
});

// --- Every word is reachable --------------------------------------------------

describe("click-to-edit on the new pages", () => {
  const footer: SiteFooterSection = { ...DEFAULT_SITE_FOOTER, socialLinks: [link("Instagram", "https://instagram.example/x")] };

  it("marks only real registry fields, and customers get none", () => {
    const sections = [DEFAULT_SITE_HEADER, footer, DEFAULT_SHOP_CATALOG];
    expect(html(renderSections(sections, []))).not.toMatch(/data-be-/);
    const editing = html(renderSections(sections, [], { editing: true }));
    for (const raw of marks(editing)) {
      const target = decodeEditTarget(raw)!;
      const section = sections.find((s) => s.sectionId === target.sectionKey)!;
      expect(resolveEditTarget(section, target.path), raw).not.toBeNull();
    }
    for (const expected of [
      "site-header::links.0.link",
      "site-footer::statement",
      "site-footer::shopHeading",
      "site-footer::infoLinks.5.link",
      "site-footer::newsletterHeading",
      "site-footer::newsletterText",
      "site-footer::socialHeading",
      "site-footer::socialLinks.0.link",
      "site-footer::location",
      "shop-catalog::eyebrow",
      "shop-catalog::headline",
      "shop-catalog::emptyTitle",
      "shop-catalog::emptyText",
    ]) {
      expect(marks(editing)).toContain(expected);
    }
  });

  it("offers an empty social list as something to click, and hides it from customers", () => {
    const editing = html(renderSections([DEFAULT_SITE_FOOTER], [], { editing: true }));
    expect(editing).toContain("+ Add your social links");
    expect(marks(editing)).toContain("site-footer::socialLinks");
    const live = html(renderSections([DEFAULT_SITE_FOOTER], []));
    expect(live).not.toContain("Add your social links");
  });

  it("lets the header stay sticky while editing — its wrapper draws no box", () => {
    const editing = html(renderSections([DEFAULT_SITE_HEADER], [], { editing: true }));
    expect(editing).toMatch(/<div data-be-section="site-header" class="contents"><header class="sticky/);
  });

  it("reaches every product page word from any product, archive or not", () => {
    const plain = product({ tags: [], description: null });
    const editing = html(renderSections([DEFAULT_PRODUCT_WORDING], [], { editing: true, product: plain }));
    for (const path of ["archiveLabel", "detailsHeading", "archiveNote", "note"]) {
      expect(marks(editing)).toContain(`product-wording::${path}`);
    }
    expect(editing).toContain("Archive 01 pieces only");

    // A customer on that product sees none of it.
    const live = html(renderSections([DEFAULT_PRODUCT_WORDING], [], { product: plain }));
    expect(live).not.toContain("Archive 01");
    expect(live).not.toContain("Details");
    expect(live).not.toContain("data-be-");
  });

  it("shows the note on every product once the owner writes one", () => {
    const wording = { ...DEFAULT_PRODUCT_WORDING, note: "Ships in 3 to 5 business days." };
    for (const p of [product(), product({ tags: [] })]) {
      expect(html(renderSections([wording], [], { product: p }))).toContain("Ships in 3 to 5 business days.");
    }
  });
});

// --- The editors' view --------------------------------------------------------

describe("what the editors draw", () => {
  const chrome = chromeFrom(null);

  it("Menu & footer: its own header and footer, editable", () => {
    const markup = html(
      editablePageView({
        templateKey: CHROME_TEMPLATE,
        sections: [DEFAULT_SITE_HEADER, DEFAULT_SITE_FOOTER],
        products: [],
        chrome,
        editing: true,
      }),
    );
    expect(marks(markup)).toContain("site-header::links.0.link");
    expect(marks(markup)).toContain("site-footer::statement");
    expect(markup).toContain("shared by all of them");
  });

  it("any other page: the live menu and footer, shown but not editable", () => {
    const markup = html(
      editablePageView({
        templateKey: SHOP_TEMPLATE,
        sections: [DEFAULT_SHOP_CATALOG],
        products: [],
        chrome,
        editing: true,
      }),
    );
    expect(marks(markup).some((m) => m.startsWith("site-"))).toBe(false);
    expect(marks(markup)).toContain("shop-catalog::headline");
    expect(markup).toContain("<header");
    expect(markup).toContain("<footer");
  });

  it("Product pages: the owner's real product, an Archive 01 piece with words first", () => {
    const plain = product({ id: "a", handle: "plain", tags: [], title: "Plain" });
    const bare = product({ id: "b", handle: "bare", description: null, title: "Bare archive" });
    const best = product({ id: "c", handle: "best", title: "Best" });
    expect(sampleProduct([plain, bare, best])?.handle).toBe("best");
    expect(sampleProduct([plain])?.handle).toBe("plain");
    expect(sampleProduct([])).toBeNull();

    const none = html(
      editablePageView({ templateKey: PRODUCT_TEMPLATE, sections: [DEFAULT_PRODUCT_WORDING], products: [], chrome, editing: true }),
    );
    expect(none).toContain("Once a product is live");
    expect(marks(none)).toContain("product-wording::detailsHeading");
  });
});

// --- Boundaries ---------------------------------------------------------------

const ROOT = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

describe("boundaries", () => {
  it("saving refuses to hide an always-shown section", () => {
    const actions = read("src/lib/cms/page-actions.ts");
    expect(actions).toMatch(/alwaysShown \? true : requested/);
    expect(actions).toMatch(/definition\?\.alwaysShown[\s\S]*is always shown/);
  });

  it("registering pages only ever inserts missing rows — never updates one", () => {
    const source = read("src/lib/cms/system-pages.ts");
    expect(source).toContain("ignoreDuplicates: true");
    expect(source).not.toMatch(/\.update\(|\.delete\(/);
  });

  it("the storefront renders the menu and footer through the one renderer", () => {
    expect(read("src/app/(storefront)/layout.tsx")).toContain("getSiteChrome");
    const frame = read("src/components/storefront/storefront-frame.tsx");
    expect(frame).toMatch(/renderSections\(\[chrome\.header\]/);
    expect(frame).toMatch(/renderSections\(\[chrome\.footer\]/);
  });
});

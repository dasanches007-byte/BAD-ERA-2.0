import {
  CHROME_TEMPLATE,
  PRODUCT_TEMPLATE,
  SHOP_TEMPLATE,
} from "@/lib/cms/edit-targets";
import type {
  NavLink,
  ProductWordingSection,
  Section,
  SectionType,
  ShopCatalogSection,
  SiteFooterSection,
  SiteHeaderSection,
} from "@/lib/cms/sections";

/**
 * Starting content for the pages whose words became editable after launch
 * prep: the menu and footer, the Shop page, and the product page wording.
 *
 * Each is the wording the site already shipped with, word for word, so
 * nothing changes for a customer until the owner edits and publishes. It is
 * also the fallback when the database cannot be read, so a storefront never
 * loses its menu to an outage.
 *
 * Nothing is invented here: social links start EMPTY (handles are the
 * owner's to give) and the product page note starts empty (a shipping promise
 * is the owner's to make).
 *
 * Pure and client-safe.
 */

const link = (label: string, href: string): NavLink => ({
  link: { label, href, enabled: true },
});

export const DEFAULT_SITE_HEADER: SiteHeaderSection = {
  type: "site.header",
  sectionId: "site-header",
  enabled: true,
  schemaVersion: 1,
  links: [link("Shop", "/shop"), link("About", "/about")],
};

export const DEFAULT_SITE_FOOTER: SiteFooterSection = {
  type: "site.footer",
  sectionId: "site-footer",
  enabled: true,
  schemaVersion: 1,
  statement:
    "A California based brand built on authenticity, purpose, and progression. This is not a trend. This is a movement.",
  shopHeading: "Shop",
  shopLinks: [link("All products", "/shop"), link("Archive 01", "/shop")],
  infoHeading: "Info",
  infoLinks: [
    link("About", "/about"),
    link("Shipping", "/shipping"),
    link("Returns", "/returns-policy"),
    link("Support", "/support"),
    link("Privacy", "/privacy"),
    link("Terms", "/terms"),
  ],
  newsletterHeading: "Newsletter",
  newsletterText: "Be the first to know about drops, new releases, and exclusive access.",
  socialHeading: "Follow",
  socialLinks: [],
  location: "Based in California",
};

export const DEFAULT_SHOP_CATALOG: ShopCatalogSection = {
  type: "shop.catalog",
  sectionId: "shop-catalog",
  enabled: true,
  schemaVersion: 1,
  eyebrow: "Shop",
  headline: "All products",
  emptyTitle: "Nothing here yet",
  emptyText: "Products appear here as soon as they are published from BAD ERA Studio.",
};

export const DEFAULT_PRODUCT_WORDING: ProductWordingSection = {
  type: "product.wording",
  sectionId: "product-wording",
  enabled: true,
  schemaVersion: 1,
  archiveLabel: "Archive 01",
  detailsHeading: "Details",
  archiveNote: "Limited quantities. Never restocked.",
  note: "",
};

/** What a new draft of each template starts with. */
export const TEMPLATE_DEFAULTS: Record<string, Section[]> = {
  [CHROME_TEMPLATE]: [DEFAULT_SITE_HEADER, DEFAULT_SITE_FOOTER],
  [SHOP_TEMPLATE]: [DEFAULT_SHOP_CATALOG],
  [PRODUCT_TEMPLATE]: [DEFAULT_PRODUCT_WORDING],
};

type Of<T extends SectionType> = Extract<Section, { type: T }>;

/**
 * The one section of `type` in a page, or the default.
 *
 * Always returned shown: these sections are `alwaysShown` in the registry, so
 * a stored `enabled: false` (which saving refuses anyway) can never take the
 * menu, the footer or the Shop grid off the site.
 */
export function pickSection<T extends SectionType>(
  sections: readonly Section[] | null | undefined,
  type: T,
  fallback: Of<T>,
): Of<T> {
  const found = sections?.find((s): s is Of<T> => s.type === type);
  return { ...(found ?? fallback), enabled: true };
}

export type SiteChrome = { header: SiteHeaderSection; footer: SiteFooterSection };

/** The header and footer from the "Menu & footer" page's sections. */
export function chromeFrom(sections: readonly Section[] | null | undefined): SiteChrome {
  return {
    header: pickSection(sections, "site.header", DEFAULT_SITE_HEADER),
    footer: pickSection(sections, "site.footer", DEFAULT_SITE_FOOTER),
  };
}

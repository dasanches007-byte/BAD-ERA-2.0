/**
 * Section content model.
 *
 * Phase 2 renders the storefront from these typed payloads. Phase 4 adds the
 * Studio editor that writes them into `page_sections` — the renderers do not
 * change when that happens, only where the data comes from. That seam is the
 * whole point: layout is designed, content is edited (Master Spec §11).
 *
 * `schemaVersion` travels with every payload so a future migration can upgrade
 * saved content without breaking existing pages (Master Spec §11.4.2).
 */

/** A reference to a Media Library asset, with per-breakpoint crop intent. */
export type MediaSlot = {
  /** Null until the owner uploads final photography. Renders a placeholder. */
  mediaAssetId: string | null;
  /** Resolved at render time from the media record. */
  url?: string | null;
  alt: string;
  /** Normalised 0..1 focal point. Desktop and mobile crop independently. */
  focalDesktop: { x: number; y: number };
  focalMobile: { x: number; y: number };
  /** Optional distinct asset for small screens. */
  mobileMediaAssetId?: string | null;
  /** Shown inside the placeholder so an unfilled slot is obvious but polished. */
  placeholderLabel: string;
};

export type CtaField = {
  label: string;
  href: string;
  enabled: boolean;
};

export type SectionBase = {
  sectionId: string;
  enabled: boolean;
  schemaVersion: number;
};

export type HeroEditorialSection = SectionBase & {
  type: "hero.editorial";
  headline: string;
  /**
   * Optional supporting line. The approved Homepage 3.0 revision removed the
   * "NOT A SCAMMER." hero subtitle, so this is empty by default
   * (Master Spec §3.1).
   */
  supportingLine: string;
  cta: CtaField;
  media: MediaSlot;
};

export type TrustStripSection = SectionBase & {
  type: "trust.strip";
  items: { label: string; detail: string }[];
};

export type CampaignFeatureSection = SectionBase & {
  type: "campaign.feature";
  eyebrow: string;
  headline: string;
  supportingLine: string;
  cta: CtaField;
  media: MediaSlot;
};

export type ProductRailSection = SectionBase & {
  type: "product.rail";
  heading: string;
  viewAll: CtaField;
  /** Ordered product handles, curated in Studio. Never hard-coded downstream. */
  productHandles: string[];
};

export type EditorialStoryGridSection = SectionBase & {
  type: "editorial.story_grid";
  tiles: {
    headline: string;
    supportingLine: string;
    media: MediaSlot;
    cta?: CtaField;
  }[];
};

export type Archive01FeatureSection = SectionBase & {
  type: "archive01.feature";
  headline: string;
  supportingLine: string;
  cta: CtaField;
  /** Ordered: Original Tee, Original Crossbody, Original Era Set. */
  productHandles: string[];
  /** Closing line under the cards. */
  footnote: string;
};

export type NewsletterSection = SectionBase & {
  type: "newsletter";
  heading: string;
  supportingLine: string;
  placeholder: string;
};

/**
 * Long-form policy / editorial prose (Master Spec §14 legal surface).
 *
 * `body` is plain text split on blank lines into paragraphs by the renderer.
 * NOT rich text and NOT HTML: a policy page is exactly where a raw-HTML field
 * would be most tempting and most dangerous, and the editing guardrail says
 * Studio edits content, not markup.
 */
export type LegalProseSection = SectionBase & {
  type: "legal.prose";
  heading: string;
  /** Optional short line under the heading, e.g. "Last updated March 2026". */
  meta: string;
  body: string;
};

/** One link in a menu or footer list: words, where it goes, and shown or hidden. */
export type NavLink = { link: CtaField };

/**
 * The menu across the top of every page (page `site`, "Menu & footer").
 *
 * Only the words and destinations are content. The logo is locked artwork,
 * and Account and Cart are fixed: they are how a customer reaches their order
 * and their bag, so no edit may remove them.
 */
export type SiteHeaderSection = SectionBase & {
  type: "site.header";
  links: NavLink[];
};

/**
 * The footer on every page. Social links start EMPTY: handles are the
 * owner's to give, and a link to a profile that does not exist is worse than
 * none. The newsletter box stays disabled until signup is wired up.
 */
export type SiteFooterSection = SectionBase & {
  type: "site.footer";
  statement: string;
  shopHeading: string;
  shopLinks: NavLink[];
  infoHeading: string;
  infoLinks: NavLink[];
  newsletterHeading: string;
  newsletterText: string;
  socialHeading: string;
  socialLinks: NavLink[];
  /** The line on the right of the bottom bar, e.g. "Based in California". */
  location: string;
};

/** The Shop page's words. The products themselves come from the catalog. */
export type ShopCatalogSection = SectionBase & {
  type: "shop.catalog";
  eyebrow: string;
  headline: string;
  emptyTitle: string;
  emptyText: string;
};

/**
 * The words every product page shares. Each product's own name, price,
 * description and photos are edited in Studio → Products, not here.
 */
export type ProductWordingSection = SectionBase & {
  type: "product.wording";
  /** Shown above the name of Archive 01 pieces. */
  archiveLabel: string;
  detailsHeading: string;
  /** Shown under the details of Archive 01 pieces. */
  archiveNote: string;
  /** Optional, on every product page. Empty by default: the owner's words. */
  note: string;
};

export type Section =
  | HeroEditorialSection
  | TrustStripSection
  | CampaignFeatureSection
  | ProductRailSection
  | EditorialStoryGridSection
  | Archive01FeatureSection
  | NewsletterSection
  | LegalProseSection
  | SiteHeaderSection
  | SiteFooterSection
  | ShopCatalogSection
  | ProductWordingSection;

export type SectionType = Section["type"];

/** Every section type the v1 registry knows how to render. */
export const REGISTERED_SECTION_TYPES: readonly SectionType[] = [
  "hero.editorial",
  "legal.prose",
  "trust.strip",
  "campaign.feature",
  "product.rail",
  "editorial.story_grid",
  "archive01.feature",
  "newsletter",
  "site.header",
  "site.footer",
  "shop.catalog",
  "product.wording",
] as const;

/** Empty media slot helper — every image starts unfilled and Studio-replaceable. */
export function emptyMedia(
  alt: string,
  placeholderLabel: string,
  focal: { x: number; y: number } = { x: 0.5, y: 0.5 },
): MediaSlot {
  return {
    mediaAssetId: null,
    url: null,
    alt,
    focalDesktop: focal,
    focalMobile: focal,
    placeholderLabel,
  };
}

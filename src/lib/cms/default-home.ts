import type { Section } from "@/lib/cms/sections";
import { emptyMedia } from "@/lib/cms/sections";

/**
 * Default homepage content — the approved Homepage 3.0 structure.
 *
 * This module is the ONLY place storefront copy is written in code, and it
 * exists purely so Phase 2 has something to render before the Studio editor
 * lands. Phase 4 replaces this import with a `page_sections` read; the
 * renderers stay identical.
 *
 * Every image is an empty slot. Final photography arrives from the owner later
 * and is inserted through Studio with no code change (Master Spec §11.4.6).
 *
 * Structure locked by Master Spec §3.1:
 *   hero -> trust strip -> ERA campaign -> Featured Drops -> editorial story row
 *
 * Newsletter signup lives in the FOOTER, not as a homepage section
 * (Master Spec §3.1). The `newsletter` section type stays registered for other
 * pages, but duplicating it here would show the same form twice.
 *
 * Two things the approved revision REMOVED and which must not come back:
 *   - the "NOT A SCAMMER." hero subtitle
 *   - the four-tile category row (Tops / Outerwear / Accessories / Lookbook)
 */
export const DEFAULT_HOME_SECTIONS: Section[] = [
  {
    type: "hero.editorial",
    sectionId: "home-hero",
    enabled: true,
    schemaVersion: 1,
    headline: "BAD ERA",
    supportingLine: "",
    cta: { label: "Shop now", href: "/shop", enabled: true },
    media: emptyMedia(
      "BAD ERA campaign photography",
      "Home hero",
      { x: 0.5, y: 0.4 },
    ),
  },
  {
    type: "trust.strip",
    sectionId: "home-trust",
    enabled: true,
    schemaVersion: 1,
    items: [
      { label: "Based in California", detail: "Built different." },
      { label: "Limited drops", detail: "Quality over quantity." },
      { label: "Secure checkout", detail: "Fast & reliable shipping." },
    ],
  },
  {
    type: "campaign.feature",
    sectionId: "home-era-00",
    enabled: true,
    schemaVersion: 1,
    eyebrow: "ERA 00",
    headline: "The first chapter",
    supportingLine: "",
    // The dedicated ERA 00 landing page is deferred, so v1 points at Shop All
    // rather than shipping a route that does not exist (Master Spec §3.1).
    cta: { label: "Explore", href: "/shop", enabled: true },
    media: emptyMedia("ERA 00 campaign photography", "ERA campaign", {
      x: 0.5,
      y: 0.35,
    }),
  },
  {
    type: "archive01.feature",
    sectionId: "home-archive-01",
    enabled: true,
    schemaVersion: 1,
    headline: "From the archive",
    supportingLine: "The pieces that came first.",
    productHandles: [
      "bad-era-original-tee",
      "bad-era-original-crossbody",
      "original-era-set",
    ],
    cta: { label: "Shop Archive 01", href: "/shop", enabled: true },
    footnote: "Limited quantities. Never restocked.",
  },
  {
    type: "product.rail",
    sectionId: "home-featured",
    enabled: true,
    schemaVersion: 1,
    heading: "Featured drops",
    viewAll: { label: "View all", href: "/shop", enabled: true },
    // Curated in Studio. Empty means "fall back to newest active products"
    // rather than rendering a broken rail.
    productHandles: [],
  },
  {
    type: "editorial.story_grid",
    sectionId: "home-stories",
    enabled: true,
    schemaVersion: 1,
    tiles: [
      {
        headline: "Blessed.\nNot lucky.",
        supportingLine: "Every piece tells the story.",
        media: emptyMedia("Editorial story image", "Story 01"),
      },
      {
        headline: "Be you.\nBe different.",
        supportingLine: "Wear your identity.",
        media: emptyMedia("Editorial story image", "Story 02"),
      },
      {
        headline: "Details\nmatter.",
        supportingLine: "Quality in every detail.",
        media: emptyMedia("Editorial story image", "Story 03"),
      },
    ],
  },
];

import { z } from "zod";

import type { SectionType } from "@/lib/cms/sections";

/**
 * The Section Registry (Master Spec §11.4.2).
 *
 * Each section_type maps to a Zod schema, default data, allowed variants and an
 * inspector definition. The renderer is bound separately in
 * `src/components/sections` so this module stays importable from client code.
 *
 * We store TYPED PAYLOADS, never arbitrary HTML. That is what makes the editor
 * safe: there is no field through which CSS, a font stack, a colour, absolute
 * positioning or a <script> can reach the page (Master Spec §11.4.4).
 *
 * `schemaVersion` travels with every payload so saved content can be migrated
 * later without breaking existing pages.
 */

// --- Shared field schemas ---------------------------------------------------

export const mediaSlotSchema = z.object({
  mediaAssetId: z.string().uuid().nullable(),
  alt: z.string().max(300),
  focalDesktop: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
  focalMobile: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
  mobileMediaAssetId: z.string().uuid().nullable().optional(),
  placeholderLabel: z.string().max(60),
});

export const ctaSchema = z.object({
  label: z.string().max(40),
  // Internal path or absolute http(s) URL only. Blocks javascript:, data:,
  // and protocol-relative destinations.
  href: z
    .string()
    .max(500)
    .refine(
      (v) => v.startsWith("/") && !v.startsWith("//") ? true : /^https?:\/\/[^\s]+$/i.test(v),
      "Use an internal path like /shop, or a full https:// URL",
    ),
  enabled: z.boolean(),
});

const baseFields = {
  sectionId: z.string().min(1),
  enabled: z.boolean(),
  schemaVersion: z.number().int().positive(),
};

// --- Per-section schemas ----------------------------------------------------

export const heroEditorialSchema = z.object({
  ...baseFields,
  type: z.literal("hero.editorial"),
  headline: z.string().max(60),
  supportingLine: z.string().max(160),
  cta: ctaSchema,
  media: mediaSlotSchema,
});

export const trustStripSchema = z.object({
  ...baseFields,
  type: z.literal("trust.strip"),
  items: z
    .array(z.object({ label: z.string().max(40), detail: z.string().max(80) }))
    .min(1)
    .max(4),
});

export const campaignFeatureSchema = z.object({
  ...baseFields,
  type: z.literal("campaign.feature"),
  eyebrow: z.string().max(30),
  headline: z.string().max(80),
  supportingLine: z.string().max(200),
  cta: ctaSchema,
  media: mediaSlotSchema,
});

export const productRailSchema = z.object({
  ...baseFields,
  type: z.literal("product.rail"),
  heading: z.string().max(50),
  viewAll: ctaSchema,
  productHandles: z.array(z.string().max(120)).max(12),
});

export const editorialStoryGridSchema = z.object({
  ...baseFields,
  type: z.literal("editorial.story_grid"),
  tiles: z
    .array(
      z.object({
        headline: z.string().max(60),
        supportingLine: z.string().max(120),
        media: mediaSlotSchema,
        cta: ctaSchema.optional(),
      }),
    )
    .min(1)
    .max(3),
});

export const archive01FeatureSchema = z.object({
  ...baseFields,
  type: z.literal("archive01.feature"),
  headline: z.string().max(50),
  supportingLine: z.string().max(120),
  cta: ctaSchema,
  productHandles: z.array(z.string().max(120)).max(6),
  footnote: z.string().max(120),
});

export const newsletterSchema = z.object({
  ...baseFields,
  type: z.literal("newsletter"),
  heading: z.string().max(40),
  supportingLine: z.string().max(200),
  placeholder: z.string().max(40),
});

export const legalProseSchema = z.object({
  ...baseFields,
  type: z.literal("legal.prose"),
  heading: z.string().max(80),
  meta: z.string().max(120),
  // Generous, because a returns policy or terms document genuinely is long.
  // Still a bounded plain-text field: no markup reaches the renderer.
  body: z.string().max(20000),
});

export const sectionSchema = z.discriminatedUnion("type", [
  heroEditorialSchema,
  trustStripSchema,
  campaignFeatureSchema,
  productRailSchema,
  editorialStoryGridSchema,
  archive01FeatureSchema,
  newsletterSchema,
  legalProseSchema,
]);

// --- Inspector definitions --------------------------------------------------

/**
 * Field kinds the inspector can render.
 *
 * Note what is NOT here: no colour, no font, no size, no spacing, no CSS, no
 * raw HTML. Adding one would break the editing guardrail, so the absence is
 * deliberate and load-bearing.
 */
export type InspectorField =
  | { kind: "text"; path: string; label: string; maxLength: number; hint?: string }
  | { kind: "textarea"; path: string; label: string; maxLength: number; hint?: string }
  | { kind: "media"; path: string; label: string }
  | { kind: "cta"; path: string; label: string }
  | { kind: "productList"; path: string; label: string; max: number; hint?: string }
  | { kind: "repeater"; path: string; label: string; max: number; fields: InspectorField[] };

export type SectionDefinition = {
  type: SectionType;
  /** Owner-facing name. The enum is never shown as the primary label. */
  label: string;
  description: string;
  schemaVersion: number;
  /** Locked sections cannot be reordered or removed, only edited/disabled. */
  locked?: boolean;
  fields: InspectorField[];
};

export const SECTION_REGISTRY: Record<SectionType, SectionDefinition> = {
  "legal.prose": {
    type: "legal.prose",
    label: "Policy text",
    description:
      "Long-form copy for a policy or information page. Blank lines start a new paragraph.",
    schemaVersion: 1,
    fields: [
      { kind: "text", path: "heading", label: "Heading", maxLength: 80 },
      {
        kind: "text",
        path: "meta",
        label: "Sub-line",
        maxLength: 120,
        hint: "Optional, e.g. \u201cLast updated March 2026\u201d.",
      },
      {
        kind: "textarea",
        path: "body",
        label: "Body",
        maxLength: 20000,
        hint: "Plain text. Leave a blank line between paragraphs.",
      },
    ],
  },
  "hero.editorial": {
    type: "hero.editorial",
    label: "Hero",
    description: "Full-width cinematic opening with one primary action.",
    schemaVersion: 1,
    locked: true,
    fields: [
      { kind: "text", path: "headline", label: "Headline", maxLength: 60, hint: "Short. The display face is locked." },
      { kind: "text", path: "supportingLine", label: "Supporting line", maxLength: 160, hint: "Optional. Leave empty for the approved treatment." },
      { kind: "cta", path: "cta", label: "Primary action" },
      { kind: "media", path: "media", label: "Hero image" },
    ],
  },
  "trust.strip": {
    type: "trust.strip",
    label: "Trust strip",
    description: "Three short reassurances under the hero.",
    schemaVersion: 1,
    fields: [
      {
        kind: "repeater",
        path: "items",
        label: "Items",
        max: 4,
        fields: [
          { kind: "text", path: "label", label: "Label", maxLength: 40 },
          { kind: "text", path: "detail", label: "Detail", maxLength: 80 },
        ],
      },
    ],
  },
  "campaign.feature": {
    type: "campaign.feature",
    label: "Campaign feature",
    description: "Large editorial image with campaign language.",
    schemaVersion: 1,
    fields: [
      { kind: "text", path: "eyebrow", label: "Eyebrow", maxLength: 30 },
      { kind: "text", path: "headline", label: "Headline", maxLength: 80 },
      { kind: "text", path: "supportingLine", label: "Supporting line", maxLength: 200 },
      { kind: "cta", path: "cta", label: "Action" },
      { kind: "media", path: "media", label: "Campaign image" },
    ],
  },
  "product.rail": {
    type: "product.rail",
    label: "Product rail",
    description: "A curated row of products. Prices come from commerce data.",
    schemaVersion: 1,
    fields: [
      { kind: "text", path: "heading", label: "Heading", maxLength: 50 },
      { kind: "cta", path: "viewAll", label: "View all link" },
      { kind: "productList", path: "productHandles", label: "Products", max: 12, hint: "Ordered. Empty falls back to the newest active products." },
    ],
  },
  "editorial.story_grid": {
    type: "editorial.story_grid",
    label: "Story grid",
    description: "Three editorial tiles.",
    schemaVersion: 1,
    fields: [
      {
        kind: "repeater",
        path: "tiles",
        label: "Tiles",
        max: 3,
        fields: [
          { kind: "textarea", path: "headline", label: "Headline", maxLength: 60, hint: "Line breaks are preserved." },
          { kind: "text", path: "supportingLine", label: "Supporting line", maxLength: 120 },
          { kind: "media", path: "media", label: "Image" },
        ],
      },
    ],
  },
  "archive01.feature": {
    type: "archive01.feature",
    label: "From the archive",
    description:
      "The Archive 01 module. Restrained and historical — never sale language.",
    schemaVersion: 1,
    fields: [
      { kind: "text", path: "headline", label: "Headline", maxLength: 50 },
      { kind: "text", path: "supportingLine", label: "Supporting line", maxLength: 120 },
      { kind: "productList", path: "productHandles", label: "Products", max: 6, hint: "Tee, Crossbody, then the Set." },
      { kind: "text", path: "footnote", label: "Footnote", maxLength: 120 },
      { kind: "cta", path: "cta", label: "Section action" },
    ],
  },
  newsletter: {
    type: "newsletter",
    label: "Newsletter",
    description: "Signup block. The footer already carries one on every page.",
    schemaVersion: 1,
    fields: [
      { kind: "text", path: "heading", label: "Heading", maxLength: 40 },
      { kind: "text", path: "supportingLine", label: "Supporting line", maxLength: 200 },
      { kind: "text", path: "placeholder", label: "Input placeholder", maxLength: 40 },
    ],
  },
};

/**
 * Validate one stored payload against its registered schema.
 *
 * Used on both read and write: a payload that fails is reported rather than
 * rendered, so a bad migration surfaces as an error instead of a broken page.
 */
export function parseSection(payload: unknown) {
  return sectionSchema.safeParse(payload);
}

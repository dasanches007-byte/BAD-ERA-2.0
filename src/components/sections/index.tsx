import Link from "next/link";

import { MediaSlot } from "@/components/ui/media-slot";
import { editAttrs } from "@/lib/cms/edit-targets";
import type {
  CampaignFeatureSection,
  CtaField,
  EditorialStoryGridSection,
  HeroEditorialSection,
  LegalProseSection,
  NewsletterSection,
  Section,
  TrustStripSection,
} from "@/lib/cms/sections";

/**
 * Section renderers.
 *
 * Each maps one typed payload to semantic, responsive markup. Phase 4 registers
 * these against Studio inspector definitions; the markup does not change.
 *
 * Typography is fixed per section (Master Spec §11.3): changing the words
 * "BAD ERA" to other text must keep the exact assigned display style. Nothing
 * here reads a font size or family from content.
 *
 * `editing` is set only by owner-gated Studio routes. It adds `data-be-edit`
 * marks naming registry fields (see `lib/cms/edit-targets.ts`) and, for empty
 * optional fields and hidden buttons, a faint stand-in the owner can click.
 * Customers never receive either: the public pages never pass `editing`.
 */

/**
 * Stand-in for an empty optional field, drawn only while editing so there is
 * something to click. Hidden again by "Preview" (globals.css: data-be-empty).
 */
function EditEmpty({
  editing,
  section,
  path,
  prompt,
  className,
}: {
  editing?: boolean;
  section: Section;
  path: string;
  prompt: string;
  className?: string;
}) {
  if (!editing) return null;
  return (
    <p {...editAttrs(editing, section, path)} data-be-empty="" className={className}>
      {prompt}
    </p>
  );
}

function Cta({
  cta,
  variant = "outline",
  edit,
}: {
  cta: CtaField;
  variant?: "outline" | "underline";
  /** Edit-target attributes from the section, when editing. */
  edit?: Record<string, string>;
}) {
  const editing = Boolean(edit && Object.keys(edit).length > 0);

  if (!cta.enabled) {
    // A hidden button cannot be clicked to show it again, so while editing it
    // is drawn as a dashed stand-in. Customers see nothing, as before.
    if (!editing) return null;
    return (
      <span
        {...edit}
        data-be-empty=""
        className="label inline-flex items-center gap-3 border border-dashed border-line-strong px-6 py-3 text-ink-subtle"
      >
        {cta.label || "Button"} · hidden
      </span>
    );
  }

  if (variant === "underline") {
    return (
      <Link
        {...edit}
        href={cta.href}
        className="label group inline-flex items-center gap-3 border-b border-line-strong pb-2 text-ink transition-colors duration-[var(--animate-duration-fast)] hover:border-accent hover:text-accent-strong"
      >
        {cta.label}
        <span aria-hidden="true" className="transition-transform duration-[var(--animate-duration-base)] group-hover:translate-x-1">
          &rarr;
        </span>
      </Link>
    );
  }

  return (
    <Link
      {...edit}
      href={cta.href}
      className="label inline-flex items-center justify-center border border-ink/70 px-9 py-4 text-ink transition-colors duration-[var(--animate-duration-base)] hover:border-ink hover:bg-ink hover:text-inverse-ink"
    >
      {cta.label}
    </Link>
  );
}

export function HeroEditorial({
  section,
  editing,
}: {
  section: HeroEditorialSection;
  editing?: boolean;
}) {
  return (
    <section className="relative">
      <MediaSlot
        media={section.media}
        overlay="hero"
        priority
        sizes="100vw"
        className="h-[78vh] min-h-[520px] w-full lg:h-[86vh]"
        edit={editAttrs(editing, section, "media")}
      />
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center">
        <div className="shell pointer-events-auto">
          <h1
            {...editAttrs(editing, section, "headline")}
            className="font-display text-display-xl text-ink-strong"
          >
            {section.headline}
          </h1>
          {section.supportingLine ? (
            <p
              {...editAttrs(editing, section, "supportingLine")}
              className="mt-6 max-w-md text-sm leading-relaxed text-ink-muted"
            >
              {section.supportingLine}
            </p>
          ) : (
            <EditEmpty
              editing={editing}
              section={section}
              path="supportingLine"
              prompt="+ Add a supporting line"
              className="mt-6 max-w-md text-sm leading-relaxed text-ink-subtle"
            />
          )}
          <div className="mt-10">
            <Cta cta={section.cta} edit={editAttrs(editing, section, "cta")} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function TrustStrip({
  section,
  editing,
}: {
  section: TrustStripSection;
  editing?: boolean;
}) {
  return (
    <section className="border-y border-line bg-surface-raised">
      <ul className="shell grid gap-8 py-8 sm:grid-cols-3 sm:gap-6">
        {section.items.map((item, index) => (
          // Index, not label: the label is what the owner is editing, and a
          // key that changes with every keystroke remounts the item.
          <li key={index} className="text-center sm:text-left">
            <p
              {...editAttrs(editing, section, `items.${index}.label`)}
              className="label text-ink"
            >
              {item.label}
            </p>
            <p
              {...editAttrs(editing, section, `items.${index}.detail`)}
              className="mt-2 text-xs text-ink-subtle"
            >
              {item.detail}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CampaignFeature({
  section,
  editing,
}: {
  section: CampaignFeatureSection;
  editing?: boolean;
}) {
  return (
    <section className="relative">
      <MediaSlot
        media={section.media}
        overlay="hero"
        sizes="100vw"
        className="h-[60vh] min-h-[420px] w-full"
        edit={editAttrs(editing, section, "media")}
      />
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center">
        <div className="shell pointer-events-auto max-w-2xl">
          <p
            {...editAttrs(editing, section, "eyebrow")}
            className="font-display text-display-lg text-ink-strong"
          >
            {section.eyebrow}
          </p>
          <p
            {...editAttrs(editing, section, "headline")}
            className="label mt-4 text-ink-muted"
          >
            {section.headline}
          </p>
          {section.supportingLine ? (
            <p
              {...editAttrs(editing, section, "supportingLine")}
              className="mt-5 text-sm leading-relaxed text-ink-muted"
            >
              {section.supportingLine}
            </p>
          ) : (
            <EditEmpty
              editing={editing}
              section={section}
              path="supportingLine"
              prompt="+ Add a supporting line"
              className="mt-5 text-sm leading-relaxed text-ink-subtle"
            />
          )}
          <div className="mt-9">
            <Cta cta={section.cta} edit={editAttrs(editing, section, "cta")} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function EditorialStoryGrid({
  section,
  editing,
}: {
  section: EditorialStoryGridSection;
  editing?: boolean;
}) {
  return (
    <section className="shell py-section">
      <div className="grid gap-4 md:grid-cols-3">
        {section.tiles.map((tile, index) => (
          // Index, not headline: see TrustStrip.
          <article key={index} className="group relative">
            <MediaSlot
              media={tile.media}
              overlay="card"
              sizes="(min-width: 768px) 33vw, 100vw"
              className="aspect-[4/5] w-full"
              edit={editAttrs(editing, section, `tiles.${index}.media`)}
            />
            <div className="absolute inset-x-0 bottom-0 z-10 p-6 lg:p-8">
              <h3
                {...editAttrs(editing, section, `tiles.${index}.headline`)}
                className="font-display text-display-sm whitespace-pre-line text-ink-strong"
              >
                {tile.headline}
              </h3>
              <p
                {...editAttrs(editing, section, `tiles.${index}.supportingLine`)}
                className="mt-3 text-xs text-ink-muted"
              >
                {tile.supportingLine}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Newsletter({
  section,
  editing,
}: {
  section: NewsletterSection;
  editing?: boolean;
}) {
  return (
    <section className="border-t border-line bg-surface-raised">
      <div className="shell flex flex-col gap-8 py-16 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-lg">
          <h2
            {...editAttrs(editing, section, "heading")}
            className="font-display text-display-sm text-ink-strong"
          >
            {section.heading}
          </h2>
          <p
            {...editAttrs(editing, section, "supportingLine")}
            className="mt-3 text-sm leading-relaxed text-ink-muted"
          >
            {section.supportingLine}
          </p>
        </div>
        {/* Submission is wired to Resend in Phase 7. Disabled rather than
            pretending to accept a signup that goes nowhere. */}
        <form
          {...editAttrs(editing, section, "placeholder")}
          className="flex w-full max-w-md items-center gap-4 border-b border-line-strong pb-3"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            name="email"
            placeholder={section.placeholder}
            disabled
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-disabled focus:outline-none disabled:cursor-not-allowed"
          />
          <span className="label text-ink-disabled">Soon</span>
        </form>
      </div>
    </section>
  );
}

export { Cta };

/**
 * Long-form policy prose (Master Spec §14).
 *
 * Paragraphs are derived by splitting on blank lines. The body is rendered as
 * TEXT — never `dangerouslySetInnerHTML` — so a policy page cannot become an
 * injection surface, and the typography stays the locked editorial scale rather
 * than whatever markup someone pasted in.
 *
 * Measure is capped for readability: a terms document at full container width
 * is unreadable, and this is the one page type people actually have to read.
 */
export function LegalProse({
  section,
  editing,
}: {
  section: LegalProseSection;
  editing?: boolean;
}) {
  const paragraphs = section.body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <section className="shell py-14 lg:py-20">
      <div className="max-w-2xl">
        <h1
          {...editAttrs(editing, section, "heading")}
          className="font-display text-display-md text-ink-strong"
        >
          {section.heading}
        </h1>
        {section.meta ? (
          <p {...editAttrs(editing, section, "meta")} className="label mt-5 text-ink-subtle">
            {section.meta}
          </p>
        ) : (
          <EditEmpty
            editing={editing}
            section={section}
            path="meta"
            prompt="+ Add a sub-line, e.g. Last updated March 2026"
            className="label mt-5 text-ink-subtle"
          />
        )}

        {paragraphs.length > 0 ? (
          <div {...editAttrs(editing, section, "body")} className="mt-10 space-y-6">
            {paragraphs.map((paragraph, index) => (
              <p
                key={index}
                className="text-sm leading-relaxed text-ink-muted whitespace-pre-line"
              >
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <EditEmpty
            editing={editing}
            section={section}
            path="body"
            prompt="+ Write the text for this page"
            className="mt-10 text-sm leading-relaxed text-ink-subtle"
          />
        )}
      </div>
    </section>
  );
}

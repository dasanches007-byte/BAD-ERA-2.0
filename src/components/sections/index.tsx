import Link from "next/link";

import { MediaSlot } from "@/components/ui/media-slot";
import type {
  CampaignFeatureSection,
  CtaField,
  EditorialStoryGridSection,
  HeroEditorialSection,
  NewsletterSection,
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
 */

function Cta({ cta, variant = "outline" }: { cta: CtaField; variant?: "outline" | "underline" }) {
  if (!cta.enabled) return null;

  if (variant === "underline") {
    return (
      <Link
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
      href={cta.href}
      className="label inline-flex items-center justify-center border border-ink/70 px-9 py-4 text-ink transition-colors duration-[var(--animate-duration-base)] hover:border-ink hover:bg-ink hover:text-inverse-ink"
    >
      {cta.label}
    </Link>
  );
}

export function HeroEditorial({ section }: { section: HeroEditorialSection }) {
  return (
    <section className="relative">
      <MediaSlot
        media={section.media}
        overlay="hero"
        priority
        sizes="100vw"
        className="h-[78vh] min-h-[520px] w-full lg:h-[86vh]"
      />
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center">
        <div className="shell pointer-events-auto">
          <h1 className="font-display text-display-xl text-ink-strong">
            {section.headline}
          </h1>
          {section.supportingLine ? (
            <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-muted">
              {section.supportingLine}
            </p>
          ) : null}
          <div className="mt-10">
            <Cta cta={section.cta} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function TrustStrip({ section }: { section: TrustStripSection }) {
  return (
    <section className="border-y border-line bg-surface-raised">
      <ul className="shell grid gap-8 py-8 sm:grid-cols-3 sm:gap-6">
        {section.items.map((item) => (
          <li key={item.label} className="text-center sm:text-left">
            <p className="label text-ink">{item.label}</p>
            <p className="mt-2 text-xs text-ink-subtle">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CampaignFeature({ section }: { section: CampaignFeatureSection }) {
  return (
    <section className="relative">
      <MediaSlot
        media={section.media}
        overlay="hero"
        sizes="100vw"
        className="h-[60vh] min-h-[420px] w-full"
      />
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center">
        <div className="shell pointer-events-auto max-w-2xl">
          <p className="font-display text-display-lg text-ink-strong">
            {section.eyebrow}
          </p>
          <p className="label mt-4 text-ink-muted">{section.headline}</p>
          {section.supportingLine ? (
            <p className="mt-5 text-sm leading-relaxed text-ink-muted">
              {section.supportingLine}
            </p>
          ) : null}
          <div className="mt-9">
            <Cta cta={section.cta} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function EditorialStoryGrid({
  section,
}: {
  section: EditorialStoryGridSection;
}) {
  return (
    <section className="shell py-section">
      <div className="grid gap-4 md:grid-cols-3">
        {section.tiles.map((tile, index) => (
          <article key={`${tile.headline}-${index}`} className="group relative">
            <MediaSlot
              media={tile.media}
              overlay="card"
              sizes="(min-width: 768px) 33vw, 100vw"
              className="aspect-[4/5] w-full"
            />
            <div className="absolute inset-x-0 bottom-0 z-10 p-6 lg:p-8">
              <h3 className="font-display text-display-sm whitespace-pre-line text-ink-strong">
                {tile.headline}
              </h3>
              <p className="mt-3 text-xs text-ink-muted">{tile.supportingLine}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Newsletter({ section }: { section: NewsletterSection }) {
  return (
    <section className="border-t border-line bg-surface-raised">
      <div className="shell flex flex-col gap-8 py-16 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-lg">
          <h2 className="font-display text-display-sm text-ink-strong">
            {section.heading}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {section.supportingLine}
          </p>
        </div>
        {/* Submission is wired to Resend in Phase 7. Disabled rather than
            pretending to accept a signup that goes nowhere. */}
        <form className="flex w-full max-w-md items-center gap-4 border-b border-line-strong pb-3">
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

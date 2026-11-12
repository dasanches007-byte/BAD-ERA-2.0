import Link from "next/link";

import { BrandMark } from "@/components/ui/logo";
import { MediaSlot } from "@/components/ui/media-slot";
import { Arrow, Poster, Stitch } from "@/components/ui/poster";
import { editAttrs } from "@/lib/cms/edit-targets";
import type {
  CampaignFeatureSection,
  CtaField,
  EditorialStoryGridSection,
  HeroEditorialSection,
  LegalProseSection,
  NewsletterSection,
  Section,
  SiteBagSection,
  TrustStripSection,
} from "@/lib/cms/sections";
import { heroShowsBrandMark } from "@/lib/cms/sections";

/**
 * Section renderers, in the cement design (owner-approved 12 November 2026).
 *
 * Each maps one typed payload to semantic, responsive markup. The look is
 * fixed here and in globals.css — cement, pale cement, the poster voice, the
 * stitched seam. Nothing here reads a face, a size or a colour from content
 * (Master Spec §11.3): the owner writes the words and picks the photos, and a
 * longer line is set smaller by the design, never by a control.
 *
 * `data-tone` says whether a section is dark or pale, so the header above it
 * can be bone or black (`SiteEffects`).
 *
 * `editing` is set only by owner-gated Studio routes. It adds `data-be-edit`
 * marks naming registry fields (see `lib/cms/edit-targets.ts`) and, for empty
 * optional fields and hidden buttons, a faint stand-in the owner can click.
 * Customers never receive either: the public pages never pass `editing`.
 */

const SMALL = "text-xs font-semibold uppercase tracking-[0.14em]";

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

export type CtaTone = "bone" | "on-dark" | "on-pale" | "ink";

const PILL: Record<CtaTone, string> = {
  bone: "pill pill-bone",
  "on-dark": "pill pill-on-dark",
  "on-pale": "pill pill-on-pale",
  ink: "pill pill-ink",
};

/**
 * A button the owner controls: words, where it goes, shown or hidden. Always
 * a pill; `tone` is the design's choice for the surface it sits on.
 */
function Cta({
  cta,
  tone = "on-dark",
  variant = "pill",
  edit,
}: {
  cta: CtaField;
  tone?: CtaTone;
  /** `text` is the quiet underlined link beside a heading. */
  variant?: "pill" | "text";
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
        className={`${SMALL} inline-flex items-center gap-3 rounded-full border border-dashed border-current px-5 py-3 opacity-60`}
      >
        {cta.label || "Button"} · hidden
      </span>
    );
  }

  if (variant === "text") {
    return (
      <Link
        {...edit}
        href={cta.href}
        className={`${SMALL} border-b-[1.5px] border-current pb-[0.6em] transition-opacity duration-[var(--animate-duration-fast)] hover:opacity-70`}
      >
        {cta.label}
      </Link>
    );
  }

  return (
    <Link {...edit} href={cta.href} className={PILL[tone]}>
      {cta.label}
      <Arrow />
    </Link>
  );
}

/**
 * The hero: the photo, full screen, in colour from the first moment, signed
 * with the lockup. It holds still while the page slides up over it
 * (`.hero-hold`), easing back and dimming a little as it is covered.
 */
export function HeroEditorial({
  section,
  editing,
}: {
  section: HeroEditorialSection;
  editing?: boolean;
}) {
  return (
    <section className="hero-hold under-head overflow-hidden bg-surface" data-tone="dark">
      <MediaSlot
        media={section.media}
        cover
        priority
        sizes="100vw"
        className="hero-shot"
        edit={editAttrs(editing, section, "media")}
      />
      {/* Shade at the foot, so the lockup always reads. Looked through by clicks. */}
      <div aria-hidden="true" className="hero-shade" />
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(max(6vh,40px)+env(safe-area-inset-bottom,0px))] z-10 grid justify-items-start gap-3.5 px-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-11">
        <div className="pointer-events-auto lg:order-2 lg:mb-[1.2vw]">
          <Cta cta={section.cta} tone="bone" edit={editAttrs(editing, section, "cta")} />
        </div>
        <div className="pointer-events-auto w-full min-w-0">
          {heroShowsBrandMark(section.headline) ? (
            // The brand name is drawn as the logo, never typeset. Still the
            // page's h1 (named by the image's alt) and still the headline
            // field, so a click opens it and other words replace the logo.
            <h1 {...editAttrs(editing, section, "headline")} className="flex">
              <BrandMark fluidHeight="min(28.8vw, 17.2rem)" flush priority />
            </h1>
          ) : (
            <Poster
              as="h1"
              text={section.headline}
              cap="26cqi"
              max="15rem"
              fill="46vh"
              rise={false}
              edit={editAttrs(editing, section, "headline")}
            />
          )}
          {section.supportingLine ? (
            <p
              {...editAttrs(editing, section, "supportingLine")}
              className="mt-4 max-w-md text-sm leading-relaxed text-ink"
            >
              {section.supportingLine}
            </p>
          ) : (
            <EditEmpty
              editing={editing}
              section={section}
              path="supportingLine"
              prompt="+ Add a supporting line"
              className="mt-4 max-w-md text-sm leading-relaxed text-ink/70"
            />
          )}
        </div>
      </div>
    </section>
  );
}

/** A slim black band of short reassurances. */
export function TrustStrip({
  section,
  editing,
}: {
  section: TrustStripSection;
  editing?: boolean;
}) {
  return (
    <section className="border-y border-ink/15 bg-surface" data-tone="dark">
      <ul className="flex flex-col items-center gap-x-10 gap-y-2 px-4 py-5 text-center sm:flex-row sm:flex-wrap sm:justify-center lg:px-11">
        {section.items.map((item, index) => (
          // Index, not label: the label is what the owner is editing, and a
          // key that changes with every keystroke remounts the item.
          <li key={index} className={`${SMALL} font-medium`}>
            <span {...editAttrs(editing, section, `items.${index}.label`)} className="font-bold text-ink">
              {item.label}
            </span>
            {item.detail ? (
              <>
                <span aria-hidden="true" className="px-2 text-ink-muted">
                  ·
                </span>
                <span {...editAttrs(editing, section, `items.${index}.detail`)} className="text-ink-muted">
                  {item.detail}
                </span>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The statement: a slab of the owner's cement that slides up over the hero,
 * thick enough to throw a shadow on the photo. One line in the poster voice,
 * a button, and a framed photo if the owner sets one.
 */
export function CampaignFeature({
  section,
  editing,
}: {
  section: CampaignFeatureSection;
  editing?: boolean;
}) {
  const showPhoto = Boolean(section.media.url) || editing;
  return (
    <section
      className="cement slab-shadow grid min-h-[92vh] content-between gap-14 px-[30px] pb-11 pt-[104px] lg:px-[72px] lg:pb-[72px] lg:pt-[132px]"
      data-tone="dark"
    >
      <Stitch />
      <div className="relative">
        {section.eyebrow ? (
          <p {...editAttrs(editing, section, "eyebrow")} className={`${SMALL} mb-5`}>
            {section.eyebrow}
          </p>
        ) : (
          <EditEmpty
            editing={editing}
            section={section}
            path="eyebrow"
            prompt="+ Add a small stamp"
            className={`${SMALL} mb-5 opacity-60`}
          />
        )}
        <Poster
          text={section.headline}
          cap="31cqi"
          max="18rem"
          fill="75vh"
          edit={editAttrs(editing, section, "headline")}
        />
        {section.supportingLine ? (
          <p
            {...editAttrs(editing, section, "supportingLine")}
            className="mt-6 max-w-md text-sm leading-relaxed text-[#cbc7c0]"
          >
            {section.supportingLine}
          </p>
        ) : (
          <EditEmpty
            editing={editing}
            section={section}
            path="supportingLine"
            prompt="+ Add a supporting line"
            className="mt-6 max-w-md text-sm leading-relaxed opacity-60"
          />
        )}
      </div>
      {/* On a phone the photo sits to the right above the button; from a
          tablet up they share the slab's bottom edge. */}
      <div className="relative flex flex-col-reverse gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="self-start sm:self-end">
          <Cta cta={section.cta} tone="on-dark" edit={editAttrs(editing, section, "cta")} />
        </div>
        {showPhoto ? (
          <MediaSlot
            media={section.media}
            sizes="(min-width: 1024px) 220px, 30vw"
            className="aspect-[4/5] w-[clamp(96px,28vw,220px)] self-end border border-ink/55"
            edit={editAttrs(editing, section, "media")}
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * The rest of the shoot, on black: one line in the poster voice, quiet but
 * for the word the owner picks out, over three photos.
 */
export function EditorialStoryGrid({
  section,
  editing,
}: {
  section: EditorialStoryGridSection;
  editing?: boolean;
}) {
  // The approved arrangement: one tall photo leading, two beside it.
  const shape = ["col-span-2 aspect-[4/5] md:col-span-1", "aspect-[3/4]", "aspect-[4/5]"];
  return (
    <section
      className="night bg-surface px-4 pb-[104px] pt-24 text-ink-muted lg:px-[72px] lg:pb-[136px] lg:pt-32"
      data-tone="dark"
    >
      {section.heading ? (
        <Poster
          text={section.heading}
          className="mb-12"
          cap="21cqi"
          max="13.125rem"
          fill="69vh"
          edit={editAttrs(editing, section, "heading")}
        />
      ) : (
        <EditEmpty
          editing={editing}
          section={section}
          path="heading"
          prompt="+ Add a big line above the photos"
          className={`${SMALL} mb-10 opacity-70`}
        />
      )}
      <div className="grid grid-cols-2 items-end gap-2.5 md:grid-cols-[1.2fr_1fr_1fr]">
        {section.tiles.map((tile, index) => {
          const captioned = Boolean(tile.headline || tile.supportingLine);
          return (
            // Index, not headline: see TrustStrip.
            <figure key={index} className={`relative ${shape[index] ?? "aspect-[4/5]"}`}>
              <MediaSlot
                media={tile.media}
                cover
                overlay={captioned ? "card" : "none"}
                sizes="(min-width: 768px) 38vw, 100vw"
                edit={editAttrs(editing, section, `tiles.${index}.media`)}
              />
              {captioned || editing ? (
                <figcaption className="absolute inset-x-0 bottom-0 z-10 p-4 lg:p-6">
                  {tile.headline ? (
                    <p
                      {...editAttrs(editing, section, `tiles.${index}.headline`)}
                      className="poster whitespace-pre-line text-[clamp(1.375rem,2.6vw,2.5rem)] leading-[0.9] text-ink"
                    >
                      {tile.headline}
                    </p>
                  ) : (
                    <EditEmpty
                      editing={editing}
                      section={section}
                      path={`tiles.${index}.headline`}
                      prompt="+ Caption"
                      className={`${SMALL} text-ink/70`}
                    />
                  )}
                  {tile.supportingLine ? (
                    <p
                      {...editAttrs(editing, section, `tiles.${index}.supportingLine`)}
                      className="mt-2 text-xs leading-snug text-ink/85"
                    >
                      {tile.supportingLine}
                    </p>
                  ) : null}
                </figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>
      {section.cta.enabled || editing ? (
        <div className="mt-9 text-ink">
          <Cta cta={section.cta} tone="on-dark" edit={editAttrs(editing, section, "cta")} />
        </div>
      ) : null}
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
    <section className="border-t border-ink/15 bg-surface" data-tone="dark">
      <div className="flex flex-col gap-8 px-4 py-16 lg:flex-row lg:items-center lg:justify-between lg:px-[72px]">
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

export { Cta, EditEmpty };

/**
 * Long-form policy prose (Master Spec §14).
 *
 * Paragraphs are derived by splitting on blank lines. The body is rendered as
 * TEXT — never `dangerouslySetInnerHTML` — so a policy page cannot become an
 * injection surface, and the typography stays the locked scale rather than
 * whatever markup someone pasted in.
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
    <section className="shell py-14 lg:py-20" data-tone="dark">
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

/**
 * The bag's words and the buy buttons' words, laid out to be edited.
 *
 * Customers never see this: on the site these words appear in the slide-in
 * bag and on every buy button (`StorefrontShell`, `AddToBag`). It exists so
 * that, on the Menu & footer page, each of them is something the owner can
 * tap. Nothing here is a product, a price or a total — those are never
 * content.
 */
export function BagWording({
  section,
  editing,
}: {
  section: SiteBagSection;
  editing?: boolean;
}) {
  if (!editing) return null;
  const edit = (path: string) => editAttrs(editing, section, path);
  const word = (path: keyof SiteBagSection & string, fallback: string) => {
    const text = String(section[path] ?? "");
    return text ? { children: text } : { children: fallback, "data-be-empty": "" };
  };

  return (
    <section className="bg-surface px-4 py-16 lg:px-[72px]" data-tone="dark">
      <p className={`${SMALL} text-ink-muted`}>The bag and the buy buttons</p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
        The bag slides in from the side when someone adds a piece. Tap any of these words to
        change them. What is in the bag, and every price, comes from your products.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div className="cement max-w-[420px] overflow-hidden">
          <div className="px-5 pb-3.5 pt-[18px]">
            <h2 {...edit("title")} {...word("title", "+ Bag title")} className="poster text-[46px] leading-[0.86]" />
          </div>
          <div className="grid justify-items-start gap-[22px] border-t border-ink/20 px-5 py-7 text-base text-[#cbc7c0]">
            <p {...edit("emptyText")} {...word("emptyText", "+ What an empty bag says")} />
            <span {...edit("keepShopping")} {...word("keepShopping", "+ Keep shopping")} className="pill pill-on-dark text-ink" />
          </div>
          <div className="grid gap-3.5 border-t border-ink/20 px-5 pb-[22px] pt-[18px]">
            <p className="flex items-baseline justify-between">
              <span {...edit("subtotalLabel")} {...word("subtotalLabel", "+ Subtotal")} className={SMALL} />
              <span className="text-sm text-[#cbc7c0]">the bag&rsquo;s total</span>
            </p>
            <p {...edit("shippingNote")} {...word("shippingNote", "+ A line under the subtotal")} className="text-[13px] leading-normal text-[#cbc7c0]" />
            <span {...edit("checkoutLabel")} {...word("checkoutLabel", "+ Checkout")} className="pill pill-bone pill-wide" />
          </div>
        </div>

        <div className="pale max-w-[420px] self-start p-6">
          <p className={`${SMALL} text-pale-muted`}>On every product</p>
          <div className="mt-5 grid justify-items-start gap-3">
            <span {...edit("addToBag")} {...word("addToBag", "+ Buy button")} className="pill pill-ink" />
            <span {...edit("added")} {...word("added", "+ Just after adding")} className="pill pill-on-pale" />
            <span {...edit("soldOut")} {...word("soldOut", "+ Sold out")} className="pill pill-on-pale opacity-50" />
            <span {...edit("chooseOptions")} {...word("chooseOptions", "+ Choose options")} className="pill pill-on-pale" />
          </div>
        </div>
      </div>
    </section>
  );
}

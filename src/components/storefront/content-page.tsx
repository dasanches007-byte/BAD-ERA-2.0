import Link from "next/link";

import { renderSections } from "@/components/sections/render";
import { getPublishedSections } from "@/lib/cms/pages";

/**
 * A Studio-managed information page (Master Spec §14, §11.4).
 *
 * Policy and information pages render from `page_sections` like every other
 * page — same registry, same renderer, same publishing pipeline. There is no
 * second content system for legal copy.
 *
 * WHY THERE IS NO DEFAULT COPY:
 *
 * Privacy, terms, shipping and returns text are legally binding statements
 * about how a real business handles real money and real data. Shipping
 * placeholder text that reads like a policy would be worse than shipping
 * nothing: a customer could rely on it, and BAD ERA would be bound by words
 * nobody at BAD ERA wrote. So an unpublished page says plainly that the policy
 * is not published yet and points at a human, rather than inventing terms.
 *
 * The page still returns 200 rather than 404 — the route is real and linked
 * from the footer; the CONTENT is pending. A 404 would tell a customer the
 * policy does not exist, which is a different and worse claim.
 */
export async function ContentPage({
  pageKey,
  title,
}: {
  pageKey: string;
  title: string;
}) {
  const sections = await getPublishedSections(pageKey).catch((error) => {
    console.error(`[bad-era] content page read failed (${pageKey})`, error);
    return null;
  });

  if (sections && sections.length > 0) {
    // Information pages carry no product surfaces, so no catalog read is
    // needed — the renderer only consults it for rails.
    return <>{renderSections(sections, [])}</>;
  }

  return (
    <section className="shell py-20 lg:py-28">
      <div className="max-w-xl">
        <h1 className="font-display text-display-md text-ink-strong">{title}</h1>
        <p className="mt-8 text-sm leading-relaxed text-ink-muted">
          This page has not been published yet. We would rather leave it blank
          than publish wording we have not finalised.
        </p>
        <p className="mt-5 text-sm leading-relaxed text-ink-muted">
          If you need an answer before it is here, ask us directly and a person
          will reply.
        </p>
        <Link
          href="/support"
          className="label mt-10 inline-flex items-center border border-ink/70 px-8 py-3.5 text-ink transition-colors duration-[var(--animate-duration-base)] hover:border-ink hover:bg-ink hover:text-inverse-ink"
        >
          Contact support
        </Link>
      </div>
    </section>
  );
}

/** Shared route config for every Studio-managed information page. */
export const CONTENT_PAGE_DYNAMIC = "force-dynamic" as const;

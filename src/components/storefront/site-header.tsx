import Link from "next/link";

import { NavLink, visibleLinks } from "@/components/storefront/nav-link";
import { SecondaryBrandMark } from "@/components/ui/logo";
import { DEFAULT_SITE_HEADER } from "@/lib/cms/default-pages";
import { editAttrs } from "@/lib/cms/edit-targets";
import type { SiteHeaderSection } from "@/lib/cms/sections";

/**
 * Global storefront header. A LOCKED component (Master Spec §11.2): the owner
 * changes its menu links in Studio → Site → Menu & footer, but never its
 * structure or typography.
 *
 * The logo here is BAD alone (`SecondaryBrandMark`) — the owner's choice of
 * 6 November 2026, with the full BAD ERA lockup leading the homepage hero.
 * Account and Cart are fixed — they are how a customer reaches their order and
 * their bag, so no edit can remove them.
 *
 * LOOKBOOK and ERA 00 are approved future modules. They are not in the
 * shipped menu, because their routes do not exist yet (Master Spec §2.3).
 */

const LINK_CLASS =
  "label text-ink-muted transition-colors duration-[var(--animate-duration-fast)] hover:text-ink";

export function SiteHeader({
  section = DEFAULT_SITE_HEADER,
  editing,
}: {
  section?: SiteHeaderSection;
  editing?: boolean;
}) {
  // While editing, every link is drawn — hidden and unnamed ones as stand-ins.
  const items = (editing ? section.links : visibleLinks(section.links)).map((item) => ({
    item,
    index: section.links.indexOf(item),
  }));

  const links = (className: string) =>
    items.map(({ item, index }) => (
      <li key={index}>
        <NavLink
          link={item.link}
          className={className}
          edit={editAttrs(editing, section, `links.${index}.link`)}
        />
      </li>
    ));

  // A menu with no links still needs something to click while editing.
  const addLinks = editing && section.links.length === 0 && (
    <li>
      <span {...editAttrs(editing, section, "links")} data-be-empty="" className="label text-ink-subtle">
        + Add menu links
      </span>
    </li>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-line-faint bg-void/85 backdrop-blur-sm">
      {/* Underglow: a hairline LED with light falling onto the page below. */}
      <span aria-hidden="true" className="glow-line" />
      <span aria-hidden="true" className="glow-spill" />
      <div className="shell flex h-16 items-center justify-between gap-6 lg:h-20">
        <Link href="/" className="flex shrink-0 items-center" aria-label="BAD ERA — home">
          <SecondaryBrandMark height={36} lgHeight={40} flush priority />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-10">
            {links(LINK_CLASS)}
            {addLinks}
          </ul>
        </nav>

        <div className="flex items-center gap-6">
          <Link
            href="/account"
            className="label text-ink-muted transition-colors hover:text-ink"
          >
            Account
          </Link>
          <Link
            href="/cart"
            className="label text-ink transition-colors hover:text-accent-strong"
          >
            Cart
          </Link>
        </div>
      </div>

      {/* Mobile navigation: the same links on their own row. Wraps rather than
          scrolling sideways when the owner adds more. */}
      {items.length > 0 || addLinks ? (
        <nav aria-label="Primary mobile" className="md:hidden">
          <ul className="shell flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line-faint py-3">
            {links("label text-ink-muted")}
            {addLinks}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

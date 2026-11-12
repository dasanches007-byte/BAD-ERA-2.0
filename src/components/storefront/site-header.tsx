import Link from "next/link";

import { CartButton, MenuButton } from "@/components/storefront/header-buttons";
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
 * 6 November 2026. In the cement design (12 November 2026) the header has no
 * box of its own: it is bone over dark sections and black on a pale bar over
 * pale cement, so it carries the white mark and the black one and CSS shows
 * whichever suits what is under it (`.site-head`, `SiteEffects`). Both are the
 * owner's own files; neither is recoloured.
 *
 * Account and Cart are fixed — they are how a customer reaches their order
 * and their bag, so no edit can remove them. On a phone the owner's links sit
 * behind Menu, in a slab that slides in from the left (`PhoneMenu`).
 *
 * LOOKBOOK and ERA 00 are approved future modules. They are not in the
 * shipped menu, because their routes do not exist yet (Master Spec §2.3).
 */

const SMALL = "text-xs font-semibold uppercase tracking-[0.14em]";
const LINK = `${SMALL} py-2.5 transition-opacity duration-[var(--animate-duration-fast)] hover:opacity-70`;

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

  const links = items.map(({ item, index }) => (
    <li key={index}>
      <NavLink
        link={item.link}
        className={LINK}
        edit={editAttrs(editing, section, `links.${index}.link`)}
      />
    </li>
  ));

  // A menu with no links still needs something to click while editing.
  const addLinks = editing && section.links.length === 0 && (
    <li>
      <span {...editAttrs(editing, section, "links")} data-be-empty="" className={`${SMALL} opacity-60`}>
        + Add menu links
      </span>
    </li>
  );

  return (
    <header className="site-head" {...(editing ? { "data-editing": "" } : {})}>
      <div className="flex h-16 items-center justify-between gap-6 px-4 lg:px-11">
        <Link href="/" className="flex shrink-0 items-center" aria-label="BAD ERA — home">
          <SecondaryBrandMark height={30} flush priority className="mark-on-dark" />
          {/* The same mark in black, for the pale bar. Named once, above. */}
          <SecondaryBrandMark height={30} flush tone="black" alt="" className="mark-on-pale" />
        </Link>

        <div className="flex items-center gap-[22px]">
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-[22px]">
              {links}
              {addLinks}
            </ul>
          </nav>
          <Link href="/account" className={`${LINK} hidden md:inline`}>
            Account
          </Link>
          {editing ? null : <MenuButton className={`${LINK} md:hidden`} />}
          <CartButton className={LINK} />
        </div>
      </div>

      {/* On a phone the links are behind Menu. While the owner is editing them
          they are laid out here instead, so each one can be tapped. */}
      {editing ? (
        <nav aria-label="Primary mobile" className="md:hidden">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 pb-3">
            {links}
            {addLinks}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

/**
 * The phone menu's contents: the owner's links, then Account. Rendered on the
 * server and handed to the slab that slides in from the left.
 */
export function PhoneMenu({ section = DEFAULT_SITE_HEADER }: { section?: SiteHeaderSection }) {
  const row =
    "poster block border-b border-ink/20 py-4 text-[44px] leading-[0.9] transition-opacity hover:opacity-70";
  return (
    <nav aria-label="Menu">
      <ul className="border-t border-ink/20">
        {visibleLinks(section.links).map((item, index) => (
          <li key={index}>
            <NavLink link={item.link} className={row} />
          </li>
        ))}
        <li>
          <Link href="/account" className={row}>
            Account
          </Link>
        </li>
      </ul>
    </nav>
  );
}

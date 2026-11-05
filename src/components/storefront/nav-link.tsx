import Link from "next/link";

import type { CtaField } from "@/lib/cms/sections";

/**
 * One link from a menu or footer list (Studio → Site → Menu & footer).
 *
 * Customers see a link only when it is shown and has words. While the owner
 * is editing, a hidden or unnamed link is drawn as a faint stand-in instead,
 * so there is still something to click (hidden again by Preview, like every
 * other stand-in: `data-be-empty`).
 *
 * Destinations are already restricted by the registry to a site path or an
 * http(s) address. Another site's address opens in a new tab and is told
 * nothing about the page it came from.
 */
export function NavLink({
  link,
  className,
  edit,
}: {
  link: CtaField;
  className: string;
  /** Edit-target attributes, when editing. */
  edit?: Record<string, string>;
}) {
  const editing = Boolean(edit && Object.keys(edit).length > 0);
  const label = link.label.trim();

  if (!link.enabled || !label) {
    if (!editing) return null;
    return (
      <span {...edit} data-be-empty="" className={`${className} opacity-60`}>
        {label ? `${label} · hidden` : "+ New link"}
      </span>
    );
  }

  if (link.href.startsWith("/")) {
    return (
      <Link {...edit} href={link.href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a {...edit} href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  );
}

/** Links a customer would see: shown, and with words. */
export function visibleLinks<T extends { link: CtaField }>(items: readonly T[]): T[] {
  return items.filter((item) => item.link.enabled && item.link.label.trim().length > 0);
}

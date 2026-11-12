import { NavLink, visibleLinks } from "@/components/storefront/nav-link";
import { BrandMark } from "@/components/ui/logo";
import { Stitch } from "@/components/ui/poster";
import { DEFAULT_SITE_FOOTER } from "@/lib/cms/default-pages";
import { editAttrs } from "@/lib/cms/edit-targets";
import type { NavLink as NavLinkItem, SiteFooterSection } from "@/lib/cms/sections";

/**
 * Global storefront footer. A LOCKED component (Master Spec §11.2): its words
 * and links are edited in Studio → Site → Menu & footer; its structure and
 * typography are not.
 *
 * Cement design (12 November 2026): a slab of the owner's cement with the
 * stitched seam, the words and links, and then the full BAD ERA lockup as a
 * signature across the whole slab. The lockup is the owner's artwork at its
 * own proportions, only larger; it replaces the small BAD sign-off.
 *
 * Structure per Master Spec §3.1: brand statement, Shop links, Info links,
 * newsletter, social links, the official logo asset, and the legal line.
 *
 * Social links are shown only once the owner adds them. No handles are
 * invented — a link to a profile that does not exist is worse than none.
 */

const SMALL = "text-xs font-semibold uppercase tracking-[0.14em]";
const QUIET = "text-[#cbc7c0]";

export function SiteFooter({
  section = DEFAULT_SITE_FOOTER,
  editing,
}: {
  section?: SiteFooterSection;
  editing?: boolean;
}) {
  const edit = (path: string) => editAttrs(editing, section, path);
  const social = editing ? section.socialLinks : visibleLinks(section.socialLinks);

  return (
    <footer
      className="cement overflow-hidden px-[30px] pb-[calc(64px+env(safe-area-inset-bottom,0px))] pt-[72px] lg:px-[72px] lg:pb-[88px] lg:pt-24"
      data-tone="dark"
    >
      <Stitch />

      <div className="relative grid gap-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:pr-8">
          {section.statement ? (
            <p {...edit("statement")} className={`max-w-xs text-sm leading-relaxed ${QUIET}`}>
              {section.statement}
            </p>
          ) : editing ? (
            <p {...edit("statement")} data-be-empty="" className="max-w-xs text-sm leading-relaxed opacity-60">
              + Add a brand statement
            </p>
          ) : null}
        </div>

        <FooterColumn section={section} editing={editing} heading="shopHeading" list="shopLinks" />
        <FooterColumn section={section} editing={editing} heading="infoHeading" list="infoLinks" />

        <div>
          <Heading section={section} editing={editing} path="newsletterHeading" />
          {section.newsletterText ? (
            <p {...edit("newsletterText")} className={`mt-5 text-sm leading-relaxed ${QUIET}`}>
              {section.newsletterText}
            </p>
          ) : editing ? (
            <p {...edit("newsletterText")} data-be-empty="" className="mt-5 text-sm leading-relaxed opacity-60">
              + Add a line about the newsletter
            </p>
          ) : null}
          {/* Presented as disabled rather than as a control that silently
              does nothing, until signup is wired up. */}
          <form className="mt-6 flex items-center gap-3 border-b border-ink/40 pb-3">
            <label htmlFor="footer-newsletter" className="sr-only">
              Email address
            </label>
            <input
              id="footer-newsletter"
              type="email"
              name="email"
              placeholder="Enter your email"
              disabled
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink/45 focus:outline-none disabled:cursor-not-allowed"
            />
            <span className={`${SMALL} opacity-60`}>Soon</span>
          </form>

          {social.length > 0 || editing ? (
            <div className="mt-10">
              <Heading section={section} editing={editing} path="socialHeading" />
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                {social.map((item) => {
                  const index = section.socialLinks.indexOf(item);
                  return (
                    <li key={index}>
                      <NavLink
                        link={item.link}
                        className={`${SMALL} inline-block py-2.5 transition-opacity duration-[var(--animate-duration-fast)] hover:opacity-70`}
                        edit={edit(`socialLinks.${index}.link`)}
                      />
                    </li>
                  );
                })}
                {editing && section.socialLinks.length === 0 ? (
                  <li>
                    <span {...edit("socialLinks")} data-be-empty="" className={`${SMALL} inline-block py-2.5 opacity-60`}>
                      + Add your social links
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* Signed, edge to edge: the full lockup, the owner's artwork, only
          larger. The file carries its own clear space; the small scale takes
          the letters out to the slab's margins, as approved. */}
      <div className="relative mt-14 lg:mt-20">
        <BrandMark fullWidth className="scale-[1.106]" />
      </div>

      <div className={`relative mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${SMALL} ${QUIET}`}>
        <p>© {new Date().getFullYear()} BAD ERA. All rights reserved.</p>
        {section.location ? (
          <p {...edit("location")}>{section.location}</p>
        ) : editing ? (
          <p {...edit("location")} data-be-empty="" className="opacity-60">
            + Add a line
          </p>
        ) : null}
      </div>
    </footer>
  );
}

type HeadingPath = "shopHeading" | "infoHeading" | "newsletterHeading" | "socialHeading";
type ListPath = "shopLinks" | "infoLinks";

function Heading({
  section,
  editing,
  path,
}: {
  section: SiteFooterSection;
  editing?: boolean;
  path: HeadingPath;
}) {
  const text = section[path];
  if (!text && !editing) return null;
  return (
    <h2
      {...editAttrs(editing, section, path)}
      {...(text ? {} : { "data-be-empty": "" })}
      className={`${SMALL} ${text ? "" : "opacity-60"}`}
    >
      {text || "+ Add a heading"}
    </h2>
  );
}

function FooterColumn({
  section,
  editing,
  heading,
  list,
}: {
  section: SiteFooterSection;
  editing?: boolean;
  heading: HeadingPath;
  list: ListPath;
}) {
  const all: NavLinkItem[] = section[list];
  const links = editing ? all : visibleLinks(all);
  if (!editing && links.length === 0 && !section[heading]) return null;

  return (
    <div>
      <Heading section={section} editing={editing} path={heading} />
      <ul className="mt-3">
        {links.map((item) => {
          const index = all.indexOf(item);
          return (
            <li key={index}>
              <NavLink
                link={item.link}
                className={`inline-block py-1.5 text-sm ${QUIET} transition-colors duration-[var(--animate-duration-fast)] hover:text-ink`}
                edit={editAttrs(editing, section, `${list}.${index}.link`)}
              />
            </li>
          );
        })}
        {editing && all.length === 0 ? (
          <li>
            <span {...editAttrs(editing, section, list)} data-be-empty="" className="inline-block py-1.5 text-sm opacity-60">
              + Add links
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

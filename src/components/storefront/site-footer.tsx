import { NavLink, visibleLinks } from "@/components/storefront/nav-link";
import { BrandMark, SecondaryBrandMark } from "@/components/ui/logo";
import { DEFAULT_SITE_FOOTER } from "@/lib/cms/default-pages";
import { editAttrs } from "@/lib/cms/edit-targets";
import type { NavLink as NavLinkItem, SiteFooterSection } from "@/lib/cms/sections";

/**
 * Global storefront footer. A LOCKED component (Master Spec §11.2): its words
 * and links are edited in Studio → Site → Menu & footer; its structure and
 * typography are not.
 *
 * Structure per Master Spec §3.1: brand statement, Shop links, Info links,
 * newsletter, social links, the official logo asset, and the legal line.
 *
 * Social links are shown only once the owner adds them. No handles are
 * invented — a link to a profile that does not exist is worse than none.
 */
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
    <footer className="border-t border-line bg-void">
      <div className="shell grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4 lg:py-20">
        <div className="lg:pr-8">
          {/* The footer's brand moment: the full lockup, in place of the name
              once set in type beside the old monogram. */}
          <BrandMark height={64} flush />
          {section.statement ? (
            <p {...edit("statement")} className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
              {section.statement}
            </p>
          ) : editing ? (
            <p {...edit("statement")} data-be-empty="" className="mt-3 max-w-xs text-sm leading-relaxed text-ink-subtle">
              + Add a brand statement
            </p>
          ) : null}
        </div>

        <FooterColumn
          section={section}
          editing={editing}
          heading="shopHeading"
          list="shopLinks"
        />
        <FooterColumn
          section={section}
          editing={editing}
          heading="infoHeading"
          list="infoLinks"
        />

        <div>
          <Heading section={section} editing={editing} path="newsletterHeading" />
          {section.newsletterText ? (
            <p {...edit("newsletterText")} className="mt-5 text-sm leading-relaxed text-ink-muted">
              {section.newsletterText}
            </p>
          ) : editing ? (
            <p {...edit("newsletterText")} data-be-empty="" className="mt-5 text-sm leading-relaxed text-ink-subtle">
              + Add a line about the newsletter
            </p>
          ) : null}
          {/* Presented as disabled rather than as a control that silently
              does nothing, until signup is wired up. */}
          <form className="mt-6 flex items-center gap-3 border-b border-line-strong pb-3">
            <label htmlFor="footer-newsletter" className="sr-only">
              Email address
            </label>
            <input
              id="footer-newsletter"
              type="email"
              name="email"
              placeholder="Enter your email"
              disabled
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink-disabled focus:outline-none disabled:cursor-not-allowed"
            />
            <span className="label text-ink-disabled">Soon</span>
          </form>

          {social.length > 0 || editing ? (
            <div className="mt-10">
              <Heading section={section} editing={editing} path="socialHeading" />
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                {social.map((item) => {
                  const index = section.socialLinks.indexOf(item);
                  return (
                    <li key={index}>
                      <NavLink
                        link={item.link}
                        className="label text-ink-muted transition-colors duration-[var(--animate-duration-fast)] hover:text-ink"
                        edit={edit(`socialLinks.${index}.link`)}
                      />
                    </li>
                  );
                })}
                {editing && section.socialLinks.length === 0 ? (
                  <li>
                    <span {...edit("socialLinks")} data-be-empty="" className="label text-ink-subtle">
                      + Add your social links
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="shell flex flex-col items-center gap-6 border-t border-line-faint py-8 sm:flex-row sm:justify-between">
        <p className="label text-ink-subtle">
          © {new Date().getFullYear()} BAD ERA. All rights reserved.
        </p>
        {/* A small sign-off: the compact BAD, as the identity reserves it. */}
        <SecondaryBrandMark height={30} />
        {section.location ? (
          <p {...edit("location")} className="label text-ink-subtle">
            {section.location}
          </p>
        ) : editing ? (
          <p {...edit("location")} data-be-empty="" className="label text-ink-disabled">
            + Add a line
          </p>
        ) : (
          // Keeps the logo centred when the line is empty.
          <span aria-hidden="true" className="hidden sm:block" />
        )}
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
      className={`label ${text ? "text-ink-subtle" : "text-ink-disabled"}`}
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
      <ul className="mt-5 space-y-3">
        {links.map((item) => {
          const index = all.indexOf(item);
          return (
            <li key={index}>
              <NavLink
                link={item.link}
                className="text-sm text-ink-muted transition-colors duration-[var(--animate-duration-fast)] hover:text-ink"
                edit={editAttrs(editing, section, `${list}.${index}.link`)}
              />
            </li>
          );
        })}
        {editing && all.length === 0 ? (
          <li>
            <span {...editAttrs(editing, section, list)} data-be-empty="" className="text-sm text-ink-subtle">
              + Add links
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

import Link from "next/link";

import { Monogram } from "@/components/ui/logo";

/**
 * Global storefront footer. A LOCKED component (Master Spec §11.2).
 *
 * Structure per Master Spec §3.1: brand statement, Shop links, Info links,
 * newsletter, social links, the official logo asset, and the legal line.
 *
 * Link destinations become Studio-managed navigation records in Phase 4.
 */

const SHOP_LINKS = [
  { label: "All products", href: "/shop" },
  { label: "Archive 01", href: "/shop" },
];

const INFO_LINKS = [
  { label: "About", href: "/about" },
  { label: "Shipping", href: "/shipping" },
  { label: "Returns", href: "/returns-policy" },
  { label: "Support", href: "/support" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-void">
      <div className="shell grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4 lg:py-20">
        <div className="lg:pr-8">
          <p className="font-display text-2xl tracking-[0.22em] text-ink-strong">
            BAD ERA
          </p>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-muted">
            A California based brand built on authenticity, purpose, and
            progression. This is not a trend. This is a movement.
          </p>
        </div>

        <FooterColumn title="Shop" links={SHOP_LINKS} />
        <FooterColumn title="Info" links={INFO_LINKS} />

        <div>
          <h2 className="label text-ink-subtle">Newsletter</h2>
          <p className="mt-5 text-sm leading-relaxed text-ink-muted">
            Be the first to know about drops, new releases, and exclusive
            access.
          </p>
          {/* Wired to Resend in Phase 7. Presented as disabled rather than as a
              control that silently does nothing. */}
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
        </div>
      </div>

      {/* Social links are an owner-owed item (Master Spec §23.1) and become
          Studio-managed navigation records in Phase 4. No handles are invented
          here — a link to a profile that does not exist is worse than none. */}
      <div className="shell flex flex-col items-center gap-6 border-t border-line-faint py-8 sm:flex-row sm:justify-between">
        <p className="label text-ink-subtle">
          © {new Date().getFullYear()} BAD ERA. All rights reserved.
        </p>
        <Monogram size={26} />
        <p className="label text-ink-subtle">Based in California</p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h2 className="label text-ink-subtle">{title}</h2>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={`${link.label}-${link.href}`}>
            <Link
              href={link.href}
              className="text-sm text-ink-muted transition-colors duration-[var(--animate-duration-fast)] hover:text-ink"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

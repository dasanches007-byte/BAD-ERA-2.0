import Link from "next/link";

import { Monogram, Wordmark } from "@/components/ui/logo";

/**
 * Global storefront header. A LOCKED component (Master Spec §11.2): the Site
 * Editor may change its link labels and destinations later, but never its
 * structure or typography.
 *
 * LOOKBOOK and ERA 00 are approved future modules. They stay hidden until the
 * owner enables them rather than linking to routes that do not exist
 * (Master Spec §2.3, §3.1).
 */

const NAV = [
  { label: "Shop", href: "/shop", enabled: true },
  { label: "Lookbook", href: "/lookbook", enabled: false },
  { label: "ERA 00", href: "/collections/era-00", enabled: false },
  { label: "About", href: "/about", enabled: true },
];

export function SiteHeader() {
  const visible = NAV.filter((item) => item.enabled);

  return (
    <header className="sticky top-0 z-50 border-b border-line-faint bg-void/85 backdrop-blur-sm">
      <div className="shell flex h-16 items-center justify-between gap-6 lg:h-20">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="BAD ERA — home"
        >
          <Monogram size={28} priority />
          <Wordmark className="hidden sm:inline" />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-10">
            {visible.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="label text-ink-muted transition-colors duration-[var(--animate-duration-fast)] hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
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

      {/* Mobile navigation. A drawer replaces this in Phase 2 polish; for now the
          links stay reachable rather than hidden behind an unbuilt control. */}
      <nav aria-label="Primary mobile" className="md:hidden">
        <ul className="shell flex items-center gap-8 border-t border-line-faint py-3">
          {visible.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="label text-ink-muted">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

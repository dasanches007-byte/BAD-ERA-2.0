"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { STUDIO_NAV, isNavActive } from "@/components/studio/nav";
import { Monogram } from "@/components/ui/logo";

/**
 * Studio navigation.
 *
 * A persistent rail on desktop; a drawer on smaller screens. Studio must stay
 * operationally usable on mobile without becoming a separate application
 * (Master Spec §10.4.18).
 *
 * Client-side only so the active route can be highlighted. It carries no
 * authorization meaning — every route and mutation re-verifies server-side.
 */
export function StudioNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile bar */}
      <div className="flex items-center justify-between border-b border-line px-5 py-4 lg:hidden">
        <Link href="/studio" className="flex items-center gap-3">
          <Monogram size={22} />
          <span className="label text-ink">Studio</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="studio-nav-drawer"
          className="label border border-line-strong px-4 py-2 text-ink-muted transition-colors hover:border-ink hover:text-ink"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <div id="studio-nav-drawer" className="border-b border-line lg:hidden">
          <NavList onNavigate={() => setOpen(false)} />
        </div>
      ) : null}

      {/* Desktop rail */}
      <aside className="hidden w-64 shrink-0 border-r border-line lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <Link
            href="/studio"
            className="flex items-center gap-3 border-b border-line px-6 py-6"
          >
            <Monogram size={24} />
            <span className="label text-ink">Studio</span>
          </Link>
          <div className="flex-1 overflow-y-auto">
            <NavList />
          </div>
        </div>
      </aside>
    </>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Studio" className="px-3 py-5">
      {STUDIO_NAV.map((section) => (
        <div key={section.group} className="mb-7 last:mb-2">
          <p className="label px-3 pb-3 text-ink-disabled">{section.group}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              // A parent stays expanded while any of its children is active,
              // so Providers never appears orphaned from Fulfillment.
              const childActive = item.children?.some((c) =>
                isNavActive(c.href, pathname),
              );
              const active = isNavActive(item.href, pathname) || childActive;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-sm px-3 py-2 text-sm transition-colors duration-[var(--animate-duration-fast)] ${
                      active
                        ? "bg-surface-raised text-ink"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>

                  {item.children && (active || childActive) ? (
                    <ul className="mt-0.5 mb-2 ml-3 border-l border-line pl-3">
                      {item.children.map((child) => {
                        const childIsActive = isNavActive(child.href, pathname);
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={onNavigate}
                              aria-current={childIsActive ? "page" : undefined}
                              className={`block py-1.5 text-xs transition-colors ${
                                childIsActive
                                  ? "text-ink"
                                  : "text-ink-subtle hover:text-ink-muted"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

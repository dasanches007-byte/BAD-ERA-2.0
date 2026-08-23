import type { ReactNode } from "react";

import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";

/**
 * Public storefront layout.
 *
 * Header and footer are locked global components: the Site Editor may change
 * their content later, but not their structure or typography
 * (Master Spec §11.2).
 */
export default function StorefrontLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      {/*
        First focusable element on every storefront page (Spec §19). Without
        it, reaching the content by keyboard means tabbing the entire header
        on every navigation.
      */}
      <a href="#main-content" className="skip-link label">
        Skip to content
      </a>
      <SiteHeader />
      {/*
        tabIndex={-1} makes the landmark focusable as a skip TARGET without
        putting it in the tab order — the link moves focus here, so the next
        Tab continues from the content rather than restarting at the header.
      */}
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

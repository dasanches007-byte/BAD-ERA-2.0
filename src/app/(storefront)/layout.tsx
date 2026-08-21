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
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

import type { ReactNode } from "react";

import { StorefrontFrame } from "@/components/storefront/storefront-frame";
import { getSiteChrome } from "@/lib/cms/pages";

/**
 * Public storefront layout.
 *
 * Header and footer are locked global components: the owner changes their
 * words and links in Studio → Site → Menu & footer, never their structure or
 * typography (Master Spec §11.2). Until that page is published — or if it
 * cannot be read — the shipped menu and footer render, so a customer never
 * meets a page without a way around.
 */
export default async function StorefrontLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const chrome = await getSiteChrome();
  return (
    <StorefrontFrame chrome={chrome} skipLink>
      {children}
    </StorefrontFrame>
  );
}

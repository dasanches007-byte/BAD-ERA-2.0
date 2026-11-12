import type { ReactNode } from "react";

import { StorefrontFrame } from "@/components/storefront/storefront-frame";
import { readBagForRender } from "@/lib/cart/bag";
import { getSiteChrome } from "@/lib/cms/pages";

/**
 * Public storefront layout.
 *
 * Header and footer are locked global components: the owner changes their
 * words and links in Studio → Site → Menu & footer, never their structure or
 * typography (Master Spec §11.2). Until that page is published — or if it
 * cannot be read — the shipped menu and footer render, so a customer never
 * meets a page without a way around.
 *
 * The visitor's bag is read here too, so the count in the header is right on
 * the first paint and the bag can slide in without leaving the page. A
 * visitor with no cart costs one cookie check; a failed read is an empty bag,
 * never a failed page.
 */
export default async function StorefrontLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [chrome, bag] = await Promise.all([getSiteChrome(), readBagForRender()]);
  return (
    <StorefrontFrame chrome={chrome} bag={bag} skipLink>
      {children}
    </StorefrontFrame>
  );
}

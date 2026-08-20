import type { ReactNode } from "react";

/**
 * Public storefront layout.
 *
 * The global header/footer are locked components rendered from published
 * content (Master Spec §11.2: "Critical global components/header/footer can be
 * locked"). They are built in Phase 2.
 */
export default function StorefrontLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <div className="min-h-screen bg-surface text-ink">{children}</div>;
}

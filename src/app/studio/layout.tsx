import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getStudioIdentity } from "@/lib/auth/studio";

/**
 * Studio is authenticated, per-request, owner-only software. It must never be
 * statically prerendered or cached: every render resolves the caller's identity
 * from their session, and a build must not need production secrets to succeed.
 */
export const dynamic = "force-dynamic";

/** Studio is private software. It must never be indexed (Master Spec §19). */
export const metadata: Metadata = {
  title: { default: "Studio", template: "%s — BAD ERA Studio" },
  robots: { index: false, follow: false },
};

/**
 * Studio shell.
 *
 * This layout gate is a convenience, not the authorization boundary: every
 * Studio read and mutation re-verifies authorization server-side. Layout checks
 * alone are never sufficient (Master Spec §10.3.10, §16.1).
 */
export default async function StudioLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const identity = await getStudioIdentity();
  if (!identity) redirect("/");

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Studio navigation rail and top bar are built in Phase 3. */}
      {children}
    </div>
  );
}

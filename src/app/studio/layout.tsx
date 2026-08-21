import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StudioNav } from "@/components/studio/studio-nav";
import { StudioTopBar } from "@/components/studio/top-bar";
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
    <div className="flex min-h-screen flex-col bg-surface text-ink lg:flex-row">
      <StudioNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <StudioTopBar
          displayName={identity.displayName}
          environment={
            process.env.NODE_ENV === "production" ? "production" : "development"
          }
        />
        <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MfaChallenge } from "@/components/studio/mfa-panel";
import { getStudioIdentityForRender } from "@/lib/auth/studio";
import { getMfaStatus } from "@/lib/auth/mfa";

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
 * Studio gate: sign-in and second factor, and nothing visual.
 *
 * The navigation rail and top bar live one level down in `(workspace)`, not
 * here, because the Site Editor's draft preview must sit behind this same gate
 * while rendering the STOREFRONT. A nested layout cannot remove what a parent
 * layout draws: the preview used to declare a "bare" layout of its own, and
 * Studio's chrome still appeared inside the preview frame. Route groups keep
 * the URL `/studio/site/<page>/preview` while giving it a different parent.
 *
 * This gate is a convenience, not the authorization boundary: every Studio read
 * and mutation re-verifies authorization server-side. Layout checks alone are
 * never sufficient (Master Spec §10.3.10, §16.1).
 */
export default async function StudioGateLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const identity = await getStudioIdentityForRender();
  // Send them somewhere they can act, not to the storefront. This gate is a
  // convenience: every Studio read and mutation re-verifies authorization.
  if (!identity) redirect("/sign-in?next=/studio");

  /**
   * Second-factor gate (Master Spec §17).
   *
   * Rendering the challenge rather than the shell is presentation only — the
   * real enforcement is inside `requireStudioOwner()`, so every read and
   * mutation behind this screen already refuses an unsatisfied session. Showing
   * it here just means the owner sees a code field instead of a wall of
   * authorization errors.
   */
  const mfa = await getMfaStatus();
  if (!mfa.satisfied) {
    const factorId = mfa.factors[0]?.id;
    // No factor id means the assurance lookup itself failed, which `mfa.ts`
    // reports as unsatisfied on purpose. There is nothing to challenge against,
    // so end the session rather than show a form that cannot succeed.
    if (!factorId) redirect("/sign-in?next=/studio");
    return <MfaChallenge factorId={factorId} />;
  }

  return children;
}

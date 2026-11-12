import { redirect } from "next/navigation";

import { AuthLink, AuthPage } from "@/components/auth/auth-page";
import { SignInForm } from "@/components/auth/sign-in-form";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/db/server";

export const metadata = {
  title: "Sign in — BAD ERA",
  robots: { index: false, follow: false },
};

/** A session is per-request state; never prerender or cache this page. */
export const dynamic = "force-dynamic";

/**
 * Sign in, for customers and for the Studio owner.
 *
 * Deliberately at the top level rather than under /studio: the Studio layout
 * redirects unauthenticated callers, so a sign-in page inside that segment
 * would redirect to itself forever. Where the visitor is headed decides the
 * words: Studio says it is private; everywhere else offers an account.
 * Signing in grants nothing by itself: Studio access is checked separately
 * against `studio_users` on every request.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = safeRedirectPath(next, "/studio");
  const forStudio = destination.startsWith("/studio");

  // Already signed in? Don't show a form they don't need.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(destination);

  return (
    <AuthPage
      title="Sign in"
      intro={
        forStudio
          ? "BAD ERA Studio is private. Signing in does not grant access on its own."
          : "See your orders, returns and saved addresses."
      }
    >
      <SignInForm next={destination} />
      <div className="mt-8 space-y-3 text-center text-sm text-ink-muted">
        <p>
          <AuthLink href="/forgot-password">Forgot your password?</AuthLink>
        </p>
        {forStudio ? null : (
          <p>
            New here?{" "}
            <AuthLink href={`/sign-up?next=${encodeURIComponent(destination)}`}>
              Create an account
            </AuthLink>
          </p>
        )}
      </div>
    </AuthPage>
  );
}

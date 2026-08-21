import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Monogram } from "@/components/ui/logo";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/db/server";

export const metadata = {
  title: "Sign in — BAD ERA",
  robots: { index: false, follow: false },
};

/** A session is per-request state; never prerender or cache this page. */
export const dynamic = "force-dynamic";

/**
 * Sign in.
 *
 * Deliberately at the top level rather than under /studio: the Studio layout
 * redirects unauthenticated callers, so a sign-in page inside that segment
 * would redirect to itself forever. It also serves customer accounts in
 * Phase 5.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = safeRedirectPath(next, "/studio");

  // Already signed in? Don't show a form they don't need.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(destination);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <Monogram size={44} priority />
            <h1 className="mt-8 font-display text-display-sm text-ink-strong">
              Sign in
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              BAD ERA Studio is private. Signing in does not grant access on its
              own.
            </p>
          </div>

          <div className="mt-10">
            <SignInForm next={destination} />
          </div>

          <p className="mt-10 text-center">
            <Link
              href="/"
              className="label text-ink-subtle transition-colors hover:text-ink"
            >
              Back to store
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

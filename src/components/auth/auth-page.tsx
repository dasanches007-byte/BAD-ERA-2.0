import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/ui/logo";

/**
 * The page around sign-in, create account, forgotten password and the email
 * link step: the primary logo (images only, never typeset), a title, a line
 * of explanation, then the form and its links.
 */
export function AuthPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <Link href="/" aria-label="Back to the store">
              <BrandMark height={72} priority />
            </Link>
            <h1 className="mt-8 font-display text-display-sm text-ink-strong">{title}</h1>
            {intro ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{intro}</p>
            ) : null}
          </div>

          <div className="mt-10">{children}</div>

          <p className="mt-10 text-center">
            <Link href="/" className="label text-ink-subtle transition-colors hover:text-ink">
              Back to store
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/** A quiet text link under a form. */
export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-ink underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

"use client";

import Link from "next/link";

/**
 * Storefront error boundary (Master Spec §17).
 *
 * Keeps the shell and the brand intact while one route fails. The error message
 * itself is never rendered — it can name a table, a column or a provider, and
 * none of that belongs on a customer's screen (Master Spec §10.5.9).
 */
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="label text-ink-subtle">Something went wrong</p>
      <h1 className="mt-6 max-w-lg font-display text-display-sm text-ink-strong">
        We couldn&rsquo;t load this page
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
        This one is on us. Try again, or head back and pick up where you left off.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="label border border-line-strong px-5 py-3 text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
        >
          Try again
        </button>
        <Link
          href="/"
          className="label px-5 py-3 text-ink-subtle transition-colors hover:text-ink"
        >
          Back to home
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-12 font-mono text-[0.6875rem] text-ink-subtle">
          Reference {error.digest}
        </p>
      ) : null}
    </main>
  );
}

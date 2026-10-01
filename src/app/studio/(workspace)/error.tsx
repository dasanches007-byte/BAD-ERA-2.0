"use client";

/**
 * Studio error boundary (Master Spec §17).
 *
 * Studio is operational software, so unlike the storefront this one says
 * plainly that the action did NOT complete. An owner who cannot tell whether a
 * write landed will retry it, and a retried inventory adjustment is a real
 * inventory error.
 */
export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <span className="label text-state-critical">This screen failed to load</span>
      <p className="max-w-md text-sm leading-relaxed text-ink-muted">
        Nothing was saved. Whatever you were doing did not go through, so it is
        safe to try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="label border border-line-strong px-4 py-2 text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
      >
        Retry
      </button>
      {error.digest ? (
        <p className="font-mono text-[0.6875rem] text-ink-subtle">
          Reference {error.digest}
        </p>
      ) : null}
    </div>
  );
}

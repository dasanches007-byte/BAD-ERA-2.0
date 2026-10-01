"use client";

/**
 * Error boundary for the Site Editor's preview frame.
 *
 * The frame shows the storefront, so a failure here must not draw Studio's
 * chrome inside it. Nothing typed in the editor is lost: the draft autosaves
 * independently of whether the preview could render. The error message itself
 * is never shown (Master Spec §10.5.9); the digest is, so a report can be
 * matched to the server log.
 */
export default function PreviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center text-ink">
      <p className="label text-ink-subtle">Preview unavailable</p>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
        The preview couldn&rsquo;t render. Your edits are saved separately and
        are not affected.
      </p>
      <button
        type="button"
        onClick={reset}
        className="label mt-8 border border-line-strong px-5 py-3 text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
      >
        Try again
      </button>
      {error.digest ? (
        <p className="mt-6 font-mono text-xs text-ink-subtle">
          Reference {error.digest}
        </p>
      ) : null}
    </main>
  );
}

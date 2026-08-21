import Link from "next/link";

/**
 * Studio top bar (Master Spec §10.2, §10.3.1).
 *
 * Always communicates the current environment and state. Publish lives in the
 * Site Editor where a draft actually exists, not as a global button that would
 * imply unsaved work everywhere.
 */
export function StudioTopBar({
  displayName,
  environment,
}: {
  displayName: string | null;
  environment: "development" | "production";
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line px-6 py-4 lg:px-10">
      <div className="flex items-center gap-4">
        <span
          className={`label inline-flex items-center border px-2.5 py-1 ${
            environment === "production"
              ? "border-line-strong text-ink-muted"
              : "border-state-warning/40 text-state-warning"
          }`}
        >
          {environment === "production" ? "Live" : "Development"}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className="label text-ink-muted transition-colors hover:text-ink"
        >
          View store
        </Link>
        <span className="label hidden text-ink-subtle sm:inline">
          {displayName ?? "Owner"}
        </span>
      </div>
    </div>
  );
}

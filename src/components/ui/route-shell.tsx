import type { ReactNode } from "react";

/**
 * Phase 0 route shell.
 *
 * Every v1 route exists from the start so navigation, layouts, metadata and
 * authorization boundaries are real before any decorative page is built
 * (Master Spec §21 Phase 0: "Do not build decorative pages before data
 * foundations exist").
 *
 * These stubs are replaced by real components in Phases 2-8. They deliberately
 * contain no product copy and no imagery.
 */
export function RouteShell({
  area,
  title,
  phase,
  children,
}: {
  area: string;
  title: string;
  phase: string;
  children?: ReactNode;
}) {
  return (
    <main className="shell flex min-h-screen flex-col justify-center py-section">
      <p className="label text-ink-subtle">{area}</p>
      <h1 className="mt-6 font-display text-display-md text-ink-strong">
        {title}
      </h1>
      <p className="mt-4 max-w-prose text-sm text-ink-muted">
        Route shell. Implemented in {phase}.
      </p>
      {children}
    </main>
  );
}

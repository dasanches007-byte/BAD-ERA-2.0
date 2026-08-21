import type { ReactNode } from "react";

/**
 * Shared Studio primitives.
 *
 * Studio is an elegant private control room, not an enterprise spreadsheet wall
 * (Master Spec §1). No giant metric cards, no gradients, no neon. Semantic
 * colour is used sparingly and NEVER alone — every state pairs colour with a
 * label (Master Spec §10.4.19, §10.5.10).
 */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="label text-ink-subtle">{eyebrow}</p> : null}
        <h1 className="mt-3 font-display text-display-sm text-ink-strong">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`hairline bg-surface-raised ${className ?? ""}`}>
      {title ? (
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2 className="label text-ink-subtle">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * A status chip. `tone` selects the semantic colour, but the LABEL always
 * carries the meaning, so the interface never depends on colour alone.
 */
export type StatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "critical"
  | "info";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-line-strong text-ink-muted",
  success: "border-state-success/40 text-state-success",
  warning: "border-state-warning/40 text-state-warning",
  critical: "border-state-critical/40 text-state-critical",
  info: "border-state-info/40 text-state-info",
};

export function StatusChip({
  tone = "neutral",
  children,
}: {
  tone?: StatusTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`label inline-flex items-center border px-2.5 py-1 ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

/** Calm zero-state. Explains what will appear here, never an error tone. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="label text-ink-subtle">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-ink-muted">{body}</p>
      {action}
    </div>
  );
}

/**
 * Surfaces a failed Studio read without pretending the answer is zero.
 *
 * An operational console must never render "0 orders" when the truth is "the
 * query failed" — the owner would act on a number that is not real.
 */
export function LoadError({ what }: { what: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span className="label text-state-critical">Could not load {what}</span>
      <p className="max-w-sm text-xs leading-relaxed text-ink-muted">
        This is a read failure, not an empty result. Refresh, and check the
        database connection if it persists.
      </p>
    </div>
  );
}

/** Money. Amounts are integer cents everywhere in the system. */
export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Dates in Studio are operational, so they stay explicit and unambiguous. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

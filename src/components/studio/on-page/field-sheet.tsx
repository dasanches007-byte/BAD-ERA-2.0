"use client";

import { useEffect, useId, useRef } from "react";

import type { SaveState } from "@/components/studio/editor-types";

/**
 * The editing panel for one thing on the page.
 *
 * A sheet that rises from the bottom on a phone, and a drawer on the right on
 * a computer — the same panel, so there is one place to learn. It is not
 * modal: the page stays visible and live behind it, so the owner watches the
 * change land where it will appear.
 */
export function FieldSheet({
  title,
  context,
  saveState,
  saveError,
  onClose,
  children,
}: {
  title: string;
  context: string;
  saveState: SaveState;
  saveError: string | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const headingId = useId();
  const panel = useRef<HTMLDivElement>(null);

  // Escape closes, wherever focus is inside the panel.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Move focus into the panel when it opens, so a keyboard or screen reader
  // user lands on the field rather than back at the top of the page.
  useEffect(() => {
    const first = panel.current?.querySelector<HTMLElement>(
      "textarea, input:not([type=hidden]):not([tabindex='-1']), select, button[data-autofocus]",
    );
    first?.focus({ preventScroll: true });
  }, [title, context]);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      className="fixed inset-x-0 bottom-0 z-[85] flex max-h-[72vh] flex-col rounded-t-2xl border-t border-line-strong bg-surface-overlay shadow-[0_-12px_40px_rgb(0_0_0/0.5)] md:inset-x-auto md:right-0 md:top-[var(--be-bar-height)] md:max-h-none md:w-[420px] md:rounded-none md:border-l md:border-t-0"
    >
      <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-ink-disabled md:hidden" aria-hidden="true" />
      <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-3 md:border-b md:border-line md:py-5">
        <div className="min-w-0">
          <h2 id={headingId} className="label truncate text-ink">
            {title}
          </h2>
          <p className="mt-1 truncate text-xs text-ink-muted">{context}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center text-ink-muted transition-colors hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>

      <footer className="flex items-center justify-between gap-4 border-t border-line px-5 py-4">
        <SaveNote state={saveState} error={saveError} />
        <button
          type="button"
          onClick={onClose}
          className="label min-h-12 bg-ink px-8 text-inverse-ink transition-opacity hover:opacity-90"
        >
          Done
        </button>
      </footer>
    </div>
  );
}

export function SaveNote({ state, error }: { state: SaveState; error: string | null }) {
  if (state === "error") {
    return (
      <p role="alert" className="min-w-0 text-xs text-state-critical">
        <span className="font-medium">Not saved.</span> {error ?? "Try again."}
      </p>
    );
  }
  if (state === "saving") {
    return <p className="text-xs text-ink-muted">Saving…</p>;
  }
  if (state === "saved") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-state-success">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        Saved to your draft
      </p>
    );
  }
  return <p className="text-xs text-ink-subtle">Changes save as you type.</p>;
}

/**
 * Words, edited in the sheet (phones, and long text on a computer).
 *
 * Shown in the same typeface as on the page, so "BAD ERA" in the hero looks
 * like the hero while it is being typed.
 */
export function SheetText({
  label,
  value,
  maxLength,
  multiline,
  hint,
  displayFace,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  multiline: boolean;
  hint?: string;
  displayFace: boolean;
  onChange: (next: string) => void;
}) {
  const id = useId();
  const remaining = maxLength - value.length;
  const near = remaining <= Math.max(5, Math.round(maxLength * 0.1));
  const long = maxLength > 400;

  return (
    <div>
      <label htmlFor={id} className="text-xs text-ink-muted">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        rows={long ? 14 : multiline ? 3 : 2}
        spellCheck
        onChange={(e) =>
          onChange(multiline || long ? e.target.value : e.target.value.replace(/\n/g, " "))
        }
        className={`mt-2 w-full resize-none border border-accent bg-surface-inset px-4 py-3 text-ink-strong focus:border-ink focus:outline-none ${
          displayFace
            ? "font-display text-[1.75rem] leading-tight tracking-[0.02em] [font-feature-settings:'lnum']"
            : "text-base leading-relaxed"
        }`}
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span className={`tabular-nums ${near ? "text-state-warning" : "text-ink-muted"}`}>
          {value.length} / {maxLength} characters
        </span>
        <span className="flex items-center gap-1.5 text-ink-muted">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="1" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Typeface locked
        </span>
      </div>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

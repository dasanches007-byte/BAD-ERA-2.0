"use client";

import type { ReactNode } from "react";

/**
 * The fields of Studio → Settings. Plain inputs in the Studio system; nothing
 * here chooses a face, size or colour for the storefront.
 */

export function SettingsField({
  id,
  label,
  value,
  onChange,
  hint,
  prefix,
  placeholder,
  inputMode,
  type = "text",
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  prefix?: string;
  placeholder?: string;
  inputMode?: "decimal" | "email" | "text";
  type?: "text" | "email";
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="label block text-ink-muted">
        {label}
      </label>
      <div className="mt-2 flex items-center border border-line-strong focus-within:border-ink">
        {prefix ? (
          <span aria-hidden="true" className="pl-3 text-sm text-ink-subtle">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          type={type}
          value={value}
          inputMode={inputMode}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
        />
      </div>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

export function SettingsTextarea({
  id,
  label,
  value,
  onChange,
  hint,
  rows = 4,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="label block text-ink-muted">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2.5 text-sm leading-relaxed text-ink focus:border-ink focus:outline-none"
      />
      {hint ? <p className="mt-2 text-xs leading-relaxed text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

export type SaveMessage = { tone: "ok" | "error"; text: string } | null;

/**
 * The save button and what happened. Never `disabled` while saving: that
 * drops keyboard focus from the control that was just used; `aria-busy` says
 * it instead, and a second press while busy is ignored by the caller.
 */
export function SaveRow({
  label = "Save",
  busy,
  onSave,
  message,
}: {
  label?: string;
  busy: boolean;
  onSave: () => void;
  message: SaveMessage;
}) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      <button
        type="button"
        onClick={onSave}
        aria-busy={busy}
        className="label border border-ink/70 px-7 py-3 text-ink transition-colors hover:bg-ink hover:text-inverse-ink aria-busy:opacity-60"
      >
        {busy ? "Saving…" : label}
      </button>
      {message ? (
        <span
          aria-live="polite"
          className={`label ${message.tone === "ok" ? "text-state-success" : "text-state-critical"}`}
        >
          {message.text}
        </span>
      ) : null}
    </div>
  );
}

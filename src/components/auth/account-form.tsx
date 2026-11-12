"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { AccountFormResult } from "@/lib/auth/actions";

export type AccountField = {
  name: string;
  label: string;
  type: "email" | "password";
  autoComplete: string;
  hint?: string;
};

/**
 * One form for the account pages: create an account, forgotten password, a
 * new password. It sends the fields to a server action and shows what came
 * back; on success the form gives way to the message, so a customer is never
 * left wondering whether it worked.
 */
export function AccountForm({
  action,
  fields,
  submitLabel,
  pendingLabel,
  hidden,
  after,
}: {
  action: (formData: FormData) => Promise<AccountFormResult | void>;
  fields: AccountField[];
  submitLabel: string;
  pendingLabel: string;
  hidden?: Record<string, string>;
  /** Shown under the success message, e.g. where to go next. */
  after?: { label: string; href: string };
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AccountFormResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (result?.ok) {
    return (
      <div aria-live="polite" className="space-y-6">
        <p className="border-l border-line-strong pl-4 text-sm leading-relaxed text-ink">
          {result.message}
        </p>
        {after ? (
          <Link
            href={after.href}
            className="label inline-block border border-ink/70 px-8 py-4 text-ink transition-colors hover:bg-ink hover:text-inverse-ink"
          >
            {after.label}
          </Link>
        ) : null}
      </div>
    );
  }

  const hasPassword = fields.some((f) => f.type === "password");

  return (
    <form
      // onSubmit, not `action`: a form action resets every field when it
      // finishes, so a wrong password would also wipe the email just typed.
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const formData = new FormData(event.currentTarget);
        setResult(null);
        startTransition(async () => {
          // An action that redirects on success never returns.
          const outcome = await action(formData);
          if (outcome) setResult(outcome);
        });
      }}
      className="space-y-6"
    >
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}

      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="label block text-ink-muted">
            {field.label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type={field.type === "password" && showPassword ? "text" : field.type}
            autoComplete={field.autoComplete}
            required
            className="mt-2 w-full border border-line-strong bg-transparent px-3 py-3 text-sm text-ink focus:border-ink focus:outline-none"
          />
          {field.hint ? <p className="mt-2 text-xs text-ink-subtle">{field.hint}</p> : null}
        </div>
      ))}

      {hasPassword ? (
        <label className="flex items-center gap-3 text-xs text-ink-muted">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="h-4 w-4 accent-current"
          />
          Show password
        </label>
      ) : null}

      {result && !result.ok ? (
        <p aria-live="polite" className="text-sm leading-relaxed text-state-critical">
          {result.message}
        </p>
      ) : null}

      <button
        type="submit"
        aria-busy={pending}
        className="label w-full border border-ink/70 px-8 py-4 text-ink transition-colors duration-[var(--animate-duration-base)] hover:bg-ink hover:text-inverse-ink aria-busy:opacity-60"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";

import { signInAction } from "@/lib/auth/actions";

/**
 * Sign-in form.
 *
 * On success the action redirects, so this component only ever renders the
 * failure path.
 */
export function SignInForm({ next }: { next: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await signInAction(formData);
          // A successful sign-in redirects and never returns a value.
          if (result && !result.ok) setError(result.message);
        });
      }}
      className="space-y-6"
    >
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="label block text-ink-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 w-full border border-line-strong bg-transparent px-3 py-3 text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="label block text-ink-muted">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full border border-line-strong bg-transparent px-3 py-3 text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      {error ? (
        <p aria-live="polite" className="label text-state-critical">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="label w-full border border-ink/70 px-8 py-4 text-ink transition-colors duration-[var(--animate-duration-base)] hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

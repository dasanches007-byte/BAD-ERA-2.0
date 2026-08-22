"use client";

import { useState, useTransition } from "react";

import { updateProfileAction } from "@/lib/account/actions";
import type { AccountIdentity } from "@/lib/account/session-types";

export function ProfileForm({ identity }: { identity: AccountIdentity }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  return (
    <form
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          const result = await updateProfileAction(formData);
          setMessage(
            result.ok
              ? { tone: "ok", text: "Saved." }
              : { tone: "error", text: result.message },
          );
        });
      }}
      className="mt-8 max-w-md space-y-6"
    >
      {/* Email is the account identity and is changed through Supabase Auth,
          not here — editing it in place would desynchronise the identity
          record from the sign-in credential. */}
      <div>
        <label className="label block text-ink-subtle">Email</label>
        <p className="mt-2 text-sm text-ink">{identity.email}</p>
      </div>

      <Field name="firstName" label="First name" defaultValue={identity.firstName ?? ""} />
      <Field name="lastName" label="Last name" defaultValue={identity.lastName ?? ""} />
      <Field name="phone" label="Phone" defaultValue={identity.phone ?? ""} />

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="marketingOptIn"
          defaultChecked={identity.marketingOptIn}
          className="size-4 accent-[var(--color-accent)]"
        />
        <span className="text-sm text-ink">Email me about new drops</span>
      </label>

      <div className="flex items-center gap-5 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="label border border-ink/70 px-8 py-3.5 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {message ? (
          <span
            aria-live="polite"
            className={`label ${
              message.tone === "ok" ? "text-state-success" : "text-state-critical"
            }`}
          >
            {message.text}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label block text-ink-subtle">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={defaultValue}
        className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
      />
    </div>
  );
}

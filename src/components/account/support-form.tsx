"use client";

import { useRef, useState, useTransition } from "react";

import { openSupportCaseAction } from "@/lib/support/actions";

export function SupportForm({ orderNumbers }: { orderNumbers: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          const result = await openSupportCaseAction(formData);
          if (result.ok) {
            setMessage({ tone: "ok", text: "Sent. We read every message." });
            formRef.current?.reset();
          } else {
            setMessage({ tone: "error", text: result.message });
          }
        });
      }}
      className="max-w-lg space-y-6"
    >
      <div>
        <label htmlFor="subject" className="label block text-ink-subtle">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          required
          maxLength={200}
          className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      {orderNumbers.length > 0 ? (
        <div>
          <label htmlFor="orderNumber" className="label block text-ink-subtle">
            Related order (optional)
          </label>
          <select
            id="orderNumber"
            name="orderNumber"
            defaultValue=""
            className="mt-2 w-full border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
          >
            <option value="">Not about a specific order</option>
            {orderNumbers.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor="body" className="label block text-ink-subtle">
          Message
        </label>
        <textarea
          id="body"
          name="body"
          rows={6}
          required
          maxLength={4000}
          className="mt-2 w-full resize-y border border-line-strong bg-transparent px-3 py-2.5 text-sm leading-relaxed text-ink focus:border-ink focus:outline-none"
        />
      </div>

      {message ? (
        <p
          aria-live="polite"
          className={`label ${
            message.tone === "ok" ? "text-state-success" : "text-state-critical"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="label border border-ink/70 px-8 py-4 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

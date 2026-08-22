"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { StatusChip, formatDateTime } from "@/components/studio/primitives";
import {
  addCaseNoteAction,
  replyToCaseAction,
  setCaseStatusAction,
} from "@/lib/support/actions";
import { SUPPORT_STATUSES, SUPPORT_STATUS_LABEL } from "@/lib/support/types";
import type { SupportCaseDetail } from "@/lib/support/types";

/**
 * Support case workspace (Master Spec §9.2).
 *
 * The conversation and the internal notes are rendered as two visually distinct
 * columns, from two different tables. A note has no visibility flag that could
 * be set wrong — it simply is not a message.
 */
export function SupportCaseWorkspace({ detail }: { detail: SupportCaseDetail }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="hairline bg-surface-raised">
          <header className="border-b border-line px-6 py-4">
            <h2 className="label text-ink-subtle">Conversation</h2>
          </header>

          {detail.messages.length === 0 ? (
            <p className="px-6 py-8 text-sm text-ink-muted">No messages yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {detail.messages.map((m) => (
                <li key={m.id} className="px-6 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="label text-ink-subtle">
                      {m.authorType === "customer"
                        ? "Customer"
                        : m.authorType === "studio_user"
                          ? "You"
                          : "System"}
                    </span>
                    <span className="label text-ink-disabled">
                      {formatDateTime(m.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-ink-muted">
                    {m.body}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form
            action={(formData) => {
              setMessage(null);
              startTransition(async () => {
                const result = await replyToCaseAction({
                  caseId: detail.id,
                  body: String(formData.get("body") ?? ""),
                });
                setMessage(
                  result.ok
                    ? { tone: "ok", text: "Reply sent to the customer." }
                    : { tone: "error", text: result.message },
                );
              });
            }}
            className="border-t border-line px-6 py-5"
          >
            <label htmlFor="reply" className="label block text-ink-subtle">
              Reply to the customer
            </label>
            <textarea
              id="reply"
              name="body"
              rows={4}
              required
              placeholder="This is visible to the customer."
              className="mt-3 w-full resize-y border border-line-strong bg-transparent px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending}
              className="label mt-4 border border-ink/70 px-6 py-2.5 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
            >
              {pending ? "Sending…" : "Send reply"}
            </button>
          </form>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="hairline bg-surface-raised">
          <header className="border-b border-line px-6 py-4">
            <h2 className="label text-ink-subtle">Case</h2>
          </header>
          <dl className="space-y-3 px-6 py-5 text-sm">
            <Row label="Number" value={detail.caseNumber} />
            <Row label="Status" value={SUPPORT_STATUS_LABEL[detail.status]} />
            <Row label="Opened" value={formatDateTime(detail.createdAt)} />
            {detail.customerEmail ? (
              <Row label="Customer" value={detail.customerEmail} />
            ) : null}
          </dl>
          {detail.orderId ? (
            <div className="border-t border-line px-6 py-4">
              <Link
                href={`/studio/orders/${detail.orderId}`}
                className="label text-ink-muted transition-colors hover:text-ink"
              >
                View order {detail.orderNumber} &rarr;
              </Link>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 border-t border-line px-6 py-4">
            {SUPPORT_STATUSES.filter((s) => s !== detail.status).map((status) => (
              <button
                key={status}
                type="button"
                disabled={pending}
                onClick={() => {
                  setMessage(null);
                  startTransition(async () => {
                    const result = await setCaseStatusAction({
                      caseId: detail.id,
                      status,
                    });
                    setMessage(
                      result.ok
                        ? { tone: "ok", text: `Marked ${SUPPORT_STATUS_LABEL[status].toLowerCase()}.` }
                        : { tone: "error", text: result.message },
                    );
                  });
                }}
                className="label border border-line-strong px-3 py-1.5 text-ink-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
              >
                {SUPPORT_STATUS_LABEL[status]}
              </button>
            ))}
          </div>
        </section>

        {/* Internal notes. A different table, never rendered to a customer. */}
        <section className="hairline bg-surface-raised">
          <header className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 className="label text-ink-subtle">Internal notes</h2>
            <StatusChip tone="neutral">Private</StatusChip>
          </header>

          {detail.notes.length === 0 ? (
            <p className="px-6 py-5 text-sm text-ink-muted">No notes yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {detail.notes.map((n) => (
                <li key={n.id} className="px-6 py-4">
                  <p className="label text-ink-disabled">
                    {formatDateTime(n.createdAt)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-ink-muted">
                    {n.body}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form
            action={(formData) => {
              setMessage(null);
              startTransition(async () => {
                const result = await addCaseNoteAction({
                  caseId: detail.id,
                  body: String(formData.get("note") ?? ""),
                });
                setMessage(
                  result.ok
                    ? { tone: "ok", text: "Note saved. The customer cannot see it." }
                    : { tone: "error", text: result.message },
                );
              });
            }}
            className="border-t border-line px-6 py-5"
          >
            <label htmlFor="note" className="sr-only">
              Internal note
            </label>
            <textarea
              id="note"
              name="note"
              rows={3}
              required
              placeholder="Only you can see this."
              className="w-full resize-y border border-line-strong bg-transparent px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending}
              className="label mt-3 border border-line-strong px-5 py-2 text-ink-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
            >
              Add note
            </button>
          </form>
        </section>

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
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-ink">{value}</dd>
    </div>
  );
}

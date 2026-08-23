"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { StatusChip, formatDateTime } from "@/components/studio/primitives";
import {
  challengeTotpAction,
  enrollTotpAction,
  unenrollTotpAction,
  verifyTotpEnrollmentAction,
} from "@/lib/auth/mfa-actions";
import type { MfaStatus } from "@/lib/auth/mfa";

/**
 * A six-digit code field.
 *
 * `inputMode="numeric"` and `autoComplete="one-time-code"` are what make a
 * phone offer the code from the notification instead of forcing the owner to
 * switch apps and retype it.
 */
function CodeInput({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  id: string;
}) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      placeholder="000000"
      className="w-40 border border-line bg-surface px-3 py-2 text-center font-mono text-lg tracking-[0.4em] text-ink placeholder:text-ink-subtle focus:border-accent-strong focus:outline-none"
    />
  );
}

/**
 * The blocking second-factor challenge (Master Spec §17).
 *
 * Shown INSTEAD of Studio when the owner has an enrolled factor they have not
 * yet satisfied. Nothing behind it renders, and — more importantly — nothing
 * behind it would work anyway: `requireStudioOwner()` refuses every read and
 * mutation at this assurance level, so this screen is the honest face of a
 * boundary that is already enforced server-side.
 */
export function MfaChallenge({ factorId }: { factorId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await challengeTotpAction({ factorId, code });
      if (result.ok) {
        setCode("");
        router.refresh();
      } else {
        setError(result.message);
        setCode("");
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="hairline w-full max-w-md bg-surface-raised px-8 py-10">
        <p className="label text-ink-subtle">BAD ERA Studio</p>
        <h1 className="mt-4 font-display text-display-sm text-ink-strong">
          Verify it&rsquo;s you
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Enter the current six-digit code from your authenticator app.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="mfa-code" className="label text-ink-subtle">
              Authentication code
            </label>
            <div className="mt-2">
              <CodeInput
                id="mfa-code"
                value={code}
                onChange={setCode}
                disabled={pending}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending || code.length !== 6}
            className="label w-full border border-accent-strong px-5 py-3 text-accent-strong transition-colors hover:bg-accent-strong hover:text-surface disabled:opacity-40"
          >
            {pending ? "Verifying…" : "Verify"}
          </button>

          {error ? (
            <p className="text-xs leading-relaxed text-state-critical" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}

/**
 * Enrolment and management, shown in Studio settings.
 *
 * The secret is offered as text alongside the QR code because a QR code is
 * useless to someone setting up on the same device they are reading it on.
 */
export function MfaSettingsPanel({ status }: { status: MfaStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enrolling, setEnrolling] = useState<{
    factorId: string;
    qrCodeSvg: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  function begin() {
    setMessage(null);
    startTransition(async () => {
      const result = await enrollTotpAction();
      if (result.ok) {
        setEnrolling({
          factorId: result.factorId,
          qrCodeSvg: result.qrCodeSvg,
          secret: result.secret,
        });
      } else {
        setMessage({ tone: "error", text: result.message });
      }
    });
  }

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setMessage(null);
    startTransition(async () => {
      const result = await verifyTotpEnrollmentAction({
        factorId: enrolling.factorId,
        code,
      });
      if (result.ok) {
        setEnrolling(null);
        setCode("");
        setMessage({
          tone: "ok",
          text: "Two-factor authentication is on. You will be asked for a code each time you sign in.",
        });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.message });
        setCode("");
      }
    });
  }

  function remove(factorId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await unenrollTotpAction({ factorId });
      if (result.ok) {
        setMessage({ tone: "ok", text: "Authenticator removed." });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.message });
      }
    });
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-ink">Two-factor authentication</p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-subtle">
            Studio holds every order, customer and payout detail. A second factor
            means a stolen password is not enough to reach it.
          </p>
        </div>
        <StatusChip tone={status.enrolled ? "success" : "warning"}>
          {status.enrolled ? "On" : "Not set up"}
        </StatusChip>
      </div>

      {status.factors.length > 0 ? (
        <ul className="divide-y divide-line border-y border-line">
          {status.factors.map((factor) => (
            <li
              key={factor.id}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">
                  {factor.friendlyName ?? "Authenticator"}
                </p>
                <p className="mt-1 text-xs text-ink-subtle">
                  Added {formatDateTime(factor.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(factor.id)}
                disabled={pending}
                className="label shrink-0 border border-line-strong px-3 py-1.5 text-ink-muted transition-colors hover:border-state-critical hover:text-state-critical disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {enrolling ? (
        <div className="hairline space-y-5 bg-surface-overlay px-5 py-5">
          <p className="label text-ink-subtle">Scan this in your authenticator</p>

          {/*
            Supabase returns the QR as an SVG data URL. It is rendered as an
            <img> rather than injected as markup — inlining a remote SVG string
            would be exactly the injection the Phase 9 CSP exists to prevent.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrolling.qrCodeSvg}
            alt="QR code for setting up two-factor authentication"
            className="size-44 bg-white p-2"
          />

          <div>
            <p className="label text-ink-subtle">Or enter this key manually</p>
            <p className="mt-2 break-all font-mono text-xs text-ink-muted">
              {enrolling.secret}
            </p>
          </div>

          <form onSubmit={confirm} className="space-y-4">
            <div>
              <label htmlFor="enroll-code" className="label text-ink-subtle">
                Enter the code it shows
              </label>
              <div className="mt-2">
                <CodeInput
                  id="enroll-code"
                  value={code}
                  onChange={setCode}
                  disabled={pending}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={pending || code.length !== 6}
                className="label border border-accent-strong px-4 py-2 text-accent-strong transition-colors hover:bg-accent-strong hover:text-surface disabled:opacity-40"
              >
                {pending ? "Confirming…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEnrolling(null);
                  setCode("");
                }}
                disabled={pending}
                className="label text-ink-subtle transition-colors hover:text-ink disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={begin}
          disabled={pending}
          className="label border border-line-strong px-4 py-2 text-ink transition-colors hover:border-accent-strong hover:text-accent-strong disabled:opacity-40"
        >
          {status.enrolled ? "Add another authenticator" : "Set up two-factor"}
        </button>
      )}

      {message ? (
        <p
          className={`text-xs leading-relaxed ${
            message.tone === "ok" ? "text-state-success" : "text-state-critical"
          }`}
          role="status"
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

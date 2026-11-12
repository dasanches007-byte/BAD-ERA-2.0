"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  SaveRow,
  SettingsField,
  SettingsTextarea,
  type SaveMessage,
} from "@/components/studio/settings-fields";
import {
  EXAMPLE_ORDER,
  ORDER_EMAIL_LIMITS,
  renderOrderConfirmationEmail,
  type OrderEmailWords,
} from "@/lib/email/order-confirmation";
import {
  saveOrderEmailWordsAction,
  sendTestOrderEmailAction,
} from "@/lib/studio/settings-actions";

/**
 * The order confirmation email's words, beside the email itself. The preview
 * is rendered by the same function that renders the real email, filled with
 * an example order, so what the owner sees is what a customer gets.
 */
export function OrderEmailForm({
  words: saved,
  emailReady,
}: {
  words: OrderEmailWords;
  /** Whether Resend is configured, so a test can actually be sent. */
  emailReady: boolean;
}) {
  const router = useRouter();
  const [words, setWords] = useState<OrderEmailWords>(saved);
  const [busy, startSave] = useTransition();
  const [message, setMessage] = useState<SaveMessage>(null);
  const [testTo, setTestTo] = useState("");
  const [testing, startTest] = useTransition();
  const [testMessage, setTestMessage] = useState<SaveMessage>(null);

  const set = (key: keyof OrderEmailWords) => (value: string) =>
    setWords((current) => ({ ...current, [key]: value }));

  // An empty site address makes the email's links relative, and a srcdoc
  // frame resolves those against this page: the logo loads from this site.
  const preview = useMemo(
    () => renderOrderConfirmationEmail(EXAMPLE_ORDER, words, ""),
    [words],
  );

  // Size the preview frame to the whole email. The frame can finish loading
  // before this component hydrates, so it is measured now AND on each load.
  const frameRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => {
      const height = frame.contentDocument?.documentElement.scrollHeight;
      if (height) frame.style.height = `${height}px`;
    };
    fit();
    frame.addEventListener("load", fit);
    return () => frame.removeEventListener("load", fit);
  }, [preview.html]);

  const unsaved = JSON.stringify(words) !== JSON.stringify(saved);

  function save() {
    if (busy) return;
    setMessage(null);
    startSave(async () => {
      const result = await saveOrderEmailWordsAction(words);
      if (result.ok) {
        setMessage({ tone: "ok", text: "Saved. The next order's email uses it." });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.message });
      }
    });
  }

  function sendTest() {
    if (testing) return;
    setTestMessage(null);
    startTest(async () => {
      const result = await sendTestOrderEmailAction({ to: testTo });
      setTestMessage(
        result.ok
          ? { tone: "ok", text: `Sent to ${testTo}. Check that inbox (and its spam folder).` }
          : { tone: "error", text: result.message },
      );
    });
  }

  return (
    <div className="grid gap-8 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-ink-muted">
          Sent to the customer once their payment is confirmed. Write{" "}
          <code className="text-ink">{"{name}"}</code> for their first name and{" "}
          <code className="text-ink">{"{order}"}</code> for the order number. The
          order&apos;s pieces, totals and shipping address are added for you.
        </p>
        <SettingsField
          id="email-subject"
          label="Subject"
          value={words.subject}
          onChange={set("subject")}
          maxLength={ORDER_EMAIL_LIMITS.subject}
        />
        <SettingsField
          id="email-heading"
          label="Heading"
          value={words.heading}
          onChange={set("heading")}
          maxLength={ORDER_EMAIL_LIMITS.heading}
          hint="Large, in capitals, at the top of the email."
        />
        <SettingsTextarea
          id="email-message"
          label="Message"
          value={words.message}
          onChange={set("message")}
          maxLength={ORDER_EMAIL_LIMITS.message}
          rows={5}
          hint="Leave a blank line between paragraphs."
        />
        <SettingsTextarea
          id="email-sign-off"
          label="Sign-off (optional)"
          value={words.signOff}
          onChange={set("signOff")}
          maxLength={ORDER_EMAIL_LIMITS.signOff}
          rows={2}
          hint="A closing line after the order, before the support link."
        />
        <SettingsField
          id="email-reply-to"
          label="Replies go to (optional)"
          type="email"
          inputMode="email"
          placeholder="you@example.com"
          value={words.replyTo}
          onChange={set("replyTo")}
          hint="If a customer replies to the email, it lands here. Leave empty to not take replies."
        />
        <SaveRow
          busy={busy}
          onSave={save}
          message={message ?? (unsaved ? { tone: "error", text: "Not saved yet." } : null)}
        />

        <div className="border-t border-line pt-6">
          <SettingsField
            id="email-test-to"
            label="Send a test to"
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            value={testTo}
            onChange={setTestTo}
            hint={
              emailReady
                ? "Sends the saved email, filled with the example order, so you can see it in a real inbox."
                : "Works once email is set up (the Resend key and sending address in Railway)."
            }
          />
          <div className="mt-4">
            <SaveRow label="Send test" busy={testing} onSave={sendTest} message={testMessage} />
          </div>
        </div>
      </div>

      <div>
        <p className="label text-ink-subtle">Preview · example order</p>
        <p className="mt-3 text-sm text-ink">
          <span className="text-ink-subtle">Subject: </span>
          {preview.subject}
        </p>
        <iframe
          title="Order email preview"
          srcDoc={preview.html}
          // No scripts, ever; same-origin only so the logo can load and the
          // frame can be sized to the whole email.
          sandbox="allow-same-origin"
          ref={frameRef}
          className="mt-3 h-[900px] w-full border border-line bg-[#0d0d0c]"
        />
      </div>
    </div>
  );
}

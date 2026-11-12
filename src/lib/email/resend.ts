import "server-only";

import { resendEnv, serverEnvStatus } from "@/lib/env/server";

/**
 * Sending one email through Resend's HTTP API.
 *
 * No SDK: one POST is the whole integration, and fetch keeps the dependency
 * surface where it is. The API key is read here, server-side, and never
 * leaves this module.
 *
 * The idempotency key makes a repeated call within Resend's window (24 hours)
 * return the first send instead of delivering a second copy, so a webhook
 * replay or a double-click can never email a customer twice.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  idempotencyKey: string;
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; notConfigured: boolean; message: string };

/** Whether BAD ERA has Resend configured (not whether Resend is reachable). */
export function emailConfigured(): boolean {
  return serverEnvStatus().resend;
}

/** The name customers see beside the sending address. */
const SENDER_NAME = "BAD ERA";

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!emailConfigured()) {
    return { ok: false, notConfigured: true, message: "Email is not set up yet." };
  }
  const env = resendEnv();

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from: `${SENDER_NAME} <${env.RESEND_FROM_EMAIL}>`,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    return {
      ok: false,
      notConfigured: false,
      message: `Could not reach Resend (${error instanceof Error ? error.name : "network error"}).`,
    };
  }

  const body = (await response.json().catch(() => null)) as
    | { id?: string; message?: string; name?: string }
    | null;

  if (!response.ok) {
    // Resend's own reason ("The badera.world domain is not verified…") is the
    // useful thing to show the owner; it carries no secret.
    return {
      ok: false,
      notConfigured: false,
      message: `Resend refused the email: ${body?.message ?? `HTTP ${response.status}`}`.slice(0, 500),
    };
  }

  return { ok: true, id: body?.id ?? null };
}

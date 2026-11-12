"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { linkCustomerRecord } from "@/lib/account/link-customer";
import { createAdminClient } from "@/lib/db/admin";
import { createClient } from "@/lib/db/server";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import {
  alreadyRegisteredMessage,
  confirmEmailMessage,
  resetPasswordMessage,
} from "@/lib/email/account-emails";
import { emailConfigured, sendEmail } from "@/lib/email/resend";
import { serverEnv } from "@/lib/env/server";
import { log } from "@/lib/observability/logger";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientSubject,
} from "@/lib/security/rate-limit";

/**
 * Email + password authentication, and the customer account around it:
 * creating an account, confirming its email, and choosing a new password.
 *
 * Every export here establishes or recovers an identity, which is why this
 * module is public by design (see tests/unit/publishing.test.ts).
 *
 * This establishes a browser session. It grants NO authority by itself:
 * Studio authorization is a separate check against `studio_users`, performed
 * again on every Studio read and mutation. Signing in and being the owner are
 * deliberately two different things.
 */

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export type SignInResult = { ok: false; message: string };

export async function signInAction(
  formData: FormData,
): Promise<SignInResult | never> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  /**
   * Rate limit BEFORE touching Supabase Auth (Master Spec §17).
   *
   * Two budgets, deliberately. Per-IP stops one host walking a password list
   * against many accounts; per-email stops a distributed attempt at ONE
   * account, which the IP budget alone would never see. An attacker has to
   * defeat both.
   *
   * The email is hashed inside the limiter, so no address is written to the
   * counter table.
   */
  const [byAddress, byAccount] = await Promise.all([
    checkRateLimit(RATE_LIMITS.signIn, await clientSubject()),
    checkRateLimit(RATE_LIMITS.signIn, `email:${parsed.data.email.toLowerCase()}`),
  ]);

  const limited = !byAddress.allowed
    ? byAddress
    : !byAccount.allowed
      ? byAccount
      : null;

  if (limited && !limited.allowed) {
    log.warn("auth.sign_in.rate_limited", {});
    return { ok: false, message: limited.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error?.code === "email_not_confirmed") {
    // Supabase reports this only once the password has matched, so it tells
    // nothing to someone who does not already hold the credentials.
    return {
      ok: false,
      message: "Confirm your email first: open the link we sent you when you created the account.",
    };
  }

  if (error) {
    // Deliberately generic. Distinguishing "no such account" from "wrong
    // password" turns the form into an account-enumeration oracle.
    log.warn("auth.sign_in.failed", { reason: error.message });
    return { ok: false, message: "That email and password do not match." };
  }

  // redirect() throws, so it must sit outside the try/catch above and after
  // the session cookie has been written.
  redirect(safeRedirectPath(parsed.data.next, "/studio"));
}

export async function signOutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ---------------------------------------------------------------------------
// Customer accounts
//
// Account emails are sent by BAD ERA through Resend, not by Supabase's own
// mailer: Supabase's built-in sender only delivers to the project's team, and
// this keeps every email the customer gets in one voice, from the store's own
// domain. The server asks Supabase for a one-time token (`generateLink`) and
// mails a link to /auth/confirm on this site, where the customer presses a
// button to use it.
//
// Nothing a visitor sees says whether an address has an account: sign-up and
// reset answer the same way either way, and only the inbox learns the truth.
// ---------------------------------------------------------------------------

export type AccountFormResult = { ok: true; message: string } | { ok: false; message: string };

const PASSWORD_RULE = z
  .string()
  .min(8, "Use at least 8 characters for your password.")
  .max(72, "Use at most 72 characters for your password.");

const NOT_OPEN =
  "Accounts can't be created just yet. You don't need one to order: checkout only asks for your email.";

async function limited(
  rule: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS],
  email?: string,
): Promise<string | null> {
  const checks = [checkRateLimit(rule, await clientSubject())];
  if (email) checks.push(checkRateLimit(rule, `email:${email.toLowerCase()}`));
  const results = await Promise.all(checks);
  const refused = results.find((r) => !r.allowed);
  return refused && !refused.allowed ? refused.message : null;
}

function confirmLink(site: string, tokenHash: string, type: string, next: string): string {
  const params = new URLSearchParams({ token_hash: tokenHash, type, next });
  return `${site}/auth/confirm?${params.toString()}`;
}

function siteAddress(): string {
  return serverEnv().NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
}

/** Create an account: email + password, confirmed by a link to the inbox. */
export async function signUpAction(formData: FormData): Promise<AccountFormResult> {
  const parsed = z
    .object({ email: z.email("Enter a valid email address"), password: PASSWORD_RULE })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  // Without email, nobody could ever confirm the account: refuse before a
  // user exists, rather than create one that is stuck.
  if (!emailConfigured()) return { ok: false, message: NOT_OPEN };

  const email = parsed.data.email.toLowerCase();
  const refusal = await limited(RATE_LIMITS.signUp, email);
  if (refusal) {
    log.warn("auth.sign_up.rate_limited", {});
    return { ok: false, message: refusal };
  }

  const site = siteAddress();
  const sent: AccountFormResult = {
    ok: true,
    message: `We've sent a link to ${email}. Open it to confirm your email and finish creating your account.`,
  };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "email_exists" || /already (been )?registered/i.test(error.message)) {
      // Tell the inbox, not the page: the page answers as if all went well.
      const mail = alreadyRegisteredMessage(site);
      await sendEmail({ to: email, ...mail, idempotencyKey: `account-exists/${email}/${Date.now()}` });
      return sent;
    }
    if (error.code === "weak_password") {
      return { ok: false, message: "Choose a stronger password: longer, and not a common one." };
    }
    log.error("auth.sign_up.failed", { reason: error.message, code: error.code });
    return { ok: false, message: "Your account could not be created. Try again in a moment." };
  }

  const props = data.properties;
  const mail = confirmEmailMessage(
    site,
    confirmLink(site, props.hashed_token, props.verification_type, "/account"),
  );
  const result = await sendEmail({
    to: email,
    ...mail,
    idempotencyKey: `confirm-email/${data.user.id}/${Date.now()}`,
  });
  if (!result.ok) {
    log.error("auth.sign_up.email_failed", { reason: result.message });
    return {
      ok: false,
      message: "We couldn't send the confirmation email. Try again in a moment.",
    };
  }
  return sent;
}

/** Forgotten password: email a link that lets the account choose a new one. */
export async function requestPasswordResetAction(formData: FormData): Promise<AccountFormResult> {
  const parsed = z
    .object({ email: z.email("Enter a valid email address") })
    .safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Enter your email." };
  }
  if (!emailConfigured()) {
    return {
      ok: false,
      message: "Password reset isn't available just yet. Contact us and we'll help.",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const refusal = await limited(RATE_LIMITS.passwordReset, email);
  if (refusal) return { ok: false, message: refusal };

  const answer: AccountFormResult = {
    ok: true,
    message: `If there's an account for ${email}, we've sent it a link to choose a new password.`,
  };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.properties) {
    // No such account is the common case here, and it gets the same answer.
    if (error && error.status !== 404 && error.code !== "user_not_found") {
      log.warn("auth.password_reset.link_failed", { reason: error.message, code: error.code });
    }
    return answer;
  }

  const site = siteAddress();
  const mail = resetPasswordMessage(
    site,
    confirmLink(site, data.properties.hashed_token, data.properties.verification_type, "/account/password"),
  );
  const result = await sendEmail({
    to: email,
    ...mail,
    idempotencyKey: `reset-password/${data.user.id}/${Date.now()}`,
  });
  if (!result.ok) log.error("auth.password_reset.email_failed", { reason: result.message });
  return answer;
}

const EMAIL_LINK_TYPES = ["signup", "email", "recovery", "magiclink", "invite"] as const;

/**
 * Use the one-time token from an account email. Runs from a button on
 * /auth/confirm, never on the GET itself, so a mail scanner that opens links
 * cannot spend the token before the customer does.
 */
export async function confirmEmailLinkAction(formData: FormData): Promise<AccountFormResult | never> {
  const parsed = z
    .object({
      tokenHash: z.string().min(10).max(200),
      type: z.enum(EMAIL_LINK_TYPES),
      next: z.string().max(200).optional(),
    })
    .safeParse({
      tokenHash: formData.get("token_hash"),
      type: formData.get("type"),
      next: formData.get("next") ?? undefined,
    });
  if (!parsed.success) return { ok: false, message: "That link is incomplete. Open it from the email again." };

  const refusal = await limited(RATE_LIMITS.emailLink);
  if (refusal) return { ok: false, message: refusal };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: parsed.data.type,
  });
  if (error || !data.user) {
    log.warn("auth.email_link.failed", { reason: error?.message ?? "no user" });
    return {
      ok: false,
      message:
        parsed.data.type === "recovery"
          ? "That link has expired or was already used. Ask for a new one."
          : "That link has expired or was already used. Try signing in; if your email isn't confirmed yet, create the account again for a fresh link.",
    };
  }

  if (parsed.data.type !== "recovery") await linkCustomerRecord(data.user);

  // redirect() throws, so it runs after the session cookie is written.
  redirect(
    parsed.data.type === "recovery"
      ? "/account/password?reset=1"
      : safeRedirectPath(parsed.data.next, "/account"),
  );
}

/** Choose a new password, signed in (after a reset link, or from the account). */
export async function setNewPasswordAction(formData: FormData): Promise<AccountFormResult> {
  const parsed = z
    .object({ password: PASSWORD_RULE, confirm: z.string() })
    .refine((v) => v.password === v.confirm, {
      message: "The two passwords don't match.",
      path: ["confirm"],
    })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your password." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Your session has ended. Ask for a new reset link." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, message: "That is already your password. Choose a different one." };
    }
    if (error.code === "weak_password") {
      return { ok: false, message: "Choose a stronger password: longer, and not a common one." };
    }
    log.warn("auth.password_change.failed", { reason: error.message, code: error.code });
    return { ok: false, message: "Your password could not be changed. Try again." };
  }
  return { ok: true, message: "Your password is changed." };
}

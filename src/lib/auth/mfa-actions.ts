"use server";

import { revalidatePath } from "next/cache";

import { getStudioIdentity } from "@/lib/auth/studio";
import { createClient } from "@/lib/db/server";
import { log } from "@/lib/observability/logger";
import { RATE_LIMITS, checkRateLimit } from "@/lib/security/rate-limit";

/**
 * TOTP enrolment and challenge (Master Spec §17).
 *
 * Every export here authorizes first: these are browser-callable endpoints, and
 * an unguarded `unenrollFactorAction` would be a way to strip a stranger's
 * second factor.
 *
 * Note the asymmetry with `requireStudioOwner()`: enrolling and verifying must
 * work at aal1, because that is the level the owner is at before they have a
 * factor. Unenrolling is the dangerous direction, so it is the one that demands
 * a satisfied session.
 */

export type MfaEnrollResult =
  | { ok: true; factorId: string; qrCodeSvg: string; secret: string }
  | { ok: false; message: string };

export type MfaResult = { ok: true } | { ok: false; message: string };

/**
 * Resolve the owner WITHOUT requiring a satisfied second factor.
 *
 * `requireStudioOwner()` deliberately refuses a session that has not cleared
 * MFA — but these actions ARE the mechanism for clearing it. Routing them
 * through that check would mean an owner with an enrolled factor could never
 * pass the challenge, which is a permanent lockout with no way back in.
 *
 * The identity check itself is unchanged: `getStudioIdentity()` still reads
 * `studio_users` and still refuses anyone who is not an active owner. What is
 * relaxed here is only the assurance LEVEL, and each action below re-imposes
 * whatever level it specifically needs — `unenrollTotpAction` requires aal2
 * outright, because removing a factor is the dangerous direction.
 */
async function ownerId(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  const identity = await getStudioIdentity();
  if (!identity) return { ok: false, message: "Studio authorization required." };
  return { ok: true, userId: identity.userId };
}

/** Begin enrolment. Returns the QR code and the secret to type in manually. */
export async function enrollTotpAction(
  friendlyName?: string,
): Promise<MfaEnrollResult> {
  const auth = await ownerId();
  if (!auth.ok) return { ok: false, message: auth.message };

  const supabase = await createClient();

  // Supabase rejects a duplicate friendly name, which is a confusing error to
  // surface. A timestamp suffix keeps re-enrolment after a lost device working.
  const name =
    friendlyName?.trim() || `Studio ${new Date().toISOString().slice(0, 10)}`;

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: name,
  });

  if (error) {
    log.error("mfa.enroll_failed", { error });
    return { ok: false, message: error.message };
  }

  log.info("mfa.enroll_started", { userId: auth.userId });

  return {
    ok: true,
    factorId: data.id,
    qrCodeSvg: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/**
 * Finish enrolment by proving the authenticator produces the right code.
 *
 * A factor only becomes `verified` here. That ordering matters: an unverified
 * factor must never start gating sign-in, or a mistyped secret would lock the
 * owner out permanently.
 */
export async function verifyTotpEnrollmentAction(input: {
  factorId: string;
  code: string;
}): Promise<MfaResult> {
  const auth = await ownerId();
  if (!auth.ok) return { ok: false, message: auth.message };

  const limit = await checkRateLimit(
    RATE_LIMITS.mfaChallenge,
    `mfa:${auth.userId}`,
  );
  if (!limit.allowed) return { ok: false, message: limit.message };

  const supabase = await createClient();

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: input.factorId });

  if (challengeError) {
    log.error("mfa.challenge_failed", { error: challengeError });
    return { ok: false, message: challengeError.message };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: input.factorId,
    challengeId: challenge.id,
    code: input.code.replace(/\s/g, ""),
  });

  if (verifyError) {
    log.warn("mfa.verify_rejected", { userId: auth.userId });
    return { ok: false, message: "That code did not match. Try the next one." };
  }

  log.info("mfa.enrolled", { userId: auth.userId });
  revalidatePath("/studio/settings");
  return { ok: true };
}

/** Satisfy the second factor for an already-signed-in session. */
export async function challengeTotpAction(input: {
  factorId: string;
  code: string;
}): Promise<MfaResult> {
  const auth = await ownerId();
  if (!auth.ok) return { ok: false, message: auth.message };

  const limit = await checkRateLimit(
    RATE_LIMITS.mfaChallenge,
    `mfa:${auth.userId}`,
  );
  if (!limit.allowed) return { ok: false, message: limit.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: input.factorId,
    code: input.code.replace(/\s/g, ""),
  });

  if (error) {
    log.warn("mfa.challenge_rejected", { userId: auth.userId });
    return { ok: false, message: "That code did not match. Try the next one." };
  }

  log.info("mfa.challenge_passed", { userId: auth.userId });
  revalidatePath("/studio", "layout");
  return { ok: true };
}

/**
 * Remove a factor.
 *
 * Requires a session that has ALREADY cleared the second factor. Otherwise
 * stealing a password would be enough to strip MFA and re-enrol — which would
 * make the whole mechanism decorative.
 */
export async function unenrollTotpAction(input: {
  factorId: string;
}): Promise<MfaResult> {
  const auth = await ownerId();
  if (!auth.ok) return { ok: false, message: auth.message };

  const supabase = await createClient();
  const { data: levels } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (levels?.currentLevel !== "aal2") {
    return {
      ok: false,
      message: "Verify your current code before removing this authenticator.",
    };
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId: input.factorId });
  if (error) {
    log.error("mfa.unenroll_failed", { error });
    return { ok: false, message: error.message };
  }

  log.warn("mfa.unenrolled", { userId: auth.userId });
  revalidatePath("/studio/settings");
  return { ok: true };
}

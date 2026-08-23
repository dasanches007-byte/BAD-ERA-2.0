import "server-only";

import { createClient } from "@/lib/db/server";
import { log } from "@/lib/observability/logger";

/**
 * Multi-factor authentication for Studio (Master Spec §17: "enable MFA for
 * Studio before production launch if supported by chosen auth flow").
 *
 * Supabase Auth supports TOTP, and encodes MFA state as an Assurance Level:
 *
 *   aal1  signed in with a password
 *   aal2  signed in AND passed a second factor
 *
 * THE ENFORCEMENT RULE, and why it is shaped this way:
 *
 *   enforce aal2 only when the user has a VERIFIED factor enrolled
 *
 * Requiring aal2 unconditionally would lock the owner out of the only interface
 * that can enrol a factor — there is no other way into Studio, and no support
 * desk behind it. So enrolment is the owner's decision, and the moment they
 * make it, it is enforced on every subsequent Studio request. `currentLevel`
 * and `nextLevel` come from Supabase itself rather than being inferred, so a
 * factor enrolled on another device takes effect here immediately.
 */

export type MfaStatus = {
  /** A verified factor exists, so a second factor is required to reach Studio. */
  enrolled: boolean;
  /** The session has actually satisfied that requirement. */
  satisfied: boolean;
  currentLevel: string | null;
  nextLevel: string | null;
  factors: { id: string; friendlyName: string | null; createdAt: string }[];
};

export async function getMfaStatus(): Promise<MfaStatus> {
  const supabase = await createClient();

  const { data: levels, error: levelError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (levelError) {
    // Fail CLOSED on the "satisfied" side: if we cannot establish that the
    // session met the requirement, we must not report that it did.
    log.error("mfa.assurance_lookup_failed", { error: levelError });
    return {
      enrolled: true,
      satisfied: false,
      currentLevel: null,
      nextLevel: null,
      factors: [],
    };
  }

  const { data: factorData } = await supabase.auth.mfa.listFactors();
  const verified = (factorData?.totp ?? []).filter(
    (factor) => factor.status === "verified",
  );

  return {
    enrolled: verified.length > 0,
    // Supabase reports nextLevel === 'aal2' exactly when a verified factor
    // exists; currentLevel reaching it means the challenge was passed.
    satisfied:
      levels.nextLevel !== "aal2" || levels.currentLevel === levels.nextLevel,
    currentLevel: levels.currentLevel,
    nextLevel: levels.nextLevel,
    factors: verified.map((factor) => ({
      id: factor.id,
      friendlyName: factor.friendly_name ?? null,
      createdAt: factor.created_at,
    })),
  };
}

/**
 * Whether this request may proceed into Studio as far as MFA is concerned.
 *
 * Deliberately separate from `requireStudioOwner()`: being the owner and having
 * cleared the second factor are two different questions, and collapsing them
 * would make the failure message wrong in one of the two cases.
 */
export async function mfaSatisfied(): Promise<boolean> {
  const status = await getMfaStatus();
  return status.satisfied;
}

import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { createAdminClient } from "@/lib/db/admin";
import { log } from "@/lib/observability/logger";

/**
 * Rate limiting (Master Spec §17: "Rate-limit auth, support submission and
 * sensitive mutations").
 *
 * State lives in PostgreSQL via `consume_rate_limit` (migration 0014), not in
 * a module-level Map. On Vercel every serverless instance would get its own
 * Map, so the real limit would be (limit x instances) and any cold start would
 * reset it — an attacker would not need to defeat that, only to arrive on a new
 * instance.
 *
 * FAIL BEHAVIOUR is per-bucket and deliberate. Sign-in fails CLOSED: if the
 * limiter is unavailable we would rather refuse a login attempt than leave
 * credential stuffing unmetered. Support submission fails OPEN: a customer with
 * a genuine problem must not be blocked from reaching the owner because a
 * counter table is unreachable.
 */

export type RateLimitRule = {
  /** Namespace, so two features never share a budget. */
  bucket: string;
  limit: number;
  windowSeconds: number;
  /** What to do when the limiter itself errors. */
  onFailure: "allow" | "deny";
  /** Shown to the caller when the limit is hit. */
  message: string;
};

/**
 * The rules, in one place so the limits are reviewable as a set rather than
 * scattered across call sites.
 */
export const RATE_LIMITS = {
  /**
   * Sign-in. Tight, because this is the credential-stuffing surface and a real
   * person almost never needs a sixth attempt in five minutes.
   */
  signIn: {
    bucket: "auth:sign-in",
    limit: 5,
    windowSeconds: 300,
    onFailure: "deny",
    message: "Too many sign-in attempts. Wait a few minutes and try again.",
  },

  /** MFA challenge verification — same reasoning as sign-in. */
  mfaChallenge: {
    bucket: "auth:mfa",
    limit: 8,
    windowSeconds: 300,
    onFailure: "deny",
    message: "Too many verification attempts. Wait a few minutes and try again.",
  },

  /**
   * Opening a support case. Loose enough that a frustrated customer writing
   * three messages is never blocked, tight enough to stop a submission flood.
   */
  supportCase: {
    bucket: "support:case",
    limit: 5,
    windowSeconds: 3600,
    onFailure: "allow",
    message: "You have opened several cases recently. Try again in a little while.",
  },

  supportMessage: {
    bucket: "support:message",
    limit: 30,
    windowSeconds: 3600,
    onFailure: "allow",
    message: "You are sending messages very quickly. Try again shortly.",
  },

  /** Starting a checkout — each one reserves inventory, so it is not free. */
  checkout: {
    bucket: "commerce:checkout",
    limit: 12,
    windowSeconds: 600,
    onFailure: "allow",
    message: "Too many checkout attempts. Wait a moment and try again.",
  },

  /** Requesting a return. */
  returnRequest: {
    bucket: "returns:request",
    limit: 10,
    windowSeconds: 3600,
    onFailure: "allow",
    message: "Too many return requests. Try again in a little while.",
  },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; message: string; retryAfterSeconds: number };

/**
 * Hash the subject before it reaches the database.
 *
 * The limiter needs to tell subjects apart, not to know who they are. Storing a
 * raw IP would put an identifier in an operational table that has none of the
 * handling rules customer data has, for no gain — equality on a hash works
 * exactly as well.
 */
function hashSubject(raw: string): string {
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/**
 * Best-effort client identity for anonymous rate limiting.
 *
 * `x-forwarded-for` is spoofable in general; on Vercel the platform sets the
 * leftmost entry itself. This is abuse control, not authorization, so a
 * best-effort identifier is the right tool — anything authenticated uses the
 * user id instead.
 */
export async function clientSubject(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return hashSubject(ip);
}

/**
 * Consume one unit against a rule.
 *
 * `subject` should be a stable identifier for the actor: a user id where one
 * exists, otherwise `clientSubject()`. It is hashed again here so a caller
 * passing a raw email or user id still never writes it to the counter table.
 */
export async function checkRateLimit(
  rule: RateLimitRule,
  subject: string,
): Promise<RateLimitResult> {
  try {
    const db = createAdminClient();
    const { data, error } = await db.rpc("consume_rate_limit", {
      p_bucket: rule.bucket,
      p_subject: hashSubject(subject),
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });

    if (error) throw error;

    const result = data as {
      allowed: boolean;
      retry_after_seconds: number;
      count: number;
    };

    if (result.allowed) return { allowed: true };

    log.warn("rate_limit.exceeded", {
      bucket: rule.bucket,
      count: result.count,
      limit: rule.limit,
    });

    return {
      allowed: false,
      message: rule.message,
      retryAfterSeconds: result.retry_after_seconds,
    };
  } catch (error) {
    log.error("rate_limit.unavailable", { bucket: rule.bucket, error });

    if (rule.onFailure === "deny") {
      return {
        allowed: false,
        message: rule.message,
        retryAfterSeconds: rule.windowSeconds,
      };
    }
    return { allowed: true };
  }
}

/** Convenience for the common anonymous case. */
export async function checkAnonymousRateLimit(
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  return checkRateLimit(rule, await clientSubject());
}

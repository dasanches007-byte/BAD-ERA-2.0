import "server-only";

import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { mfaSatisfied } from "@/lib/auth/mfa";
import type { Enums } from "@/lib/db/generated.types";

/**
 * Studio authorization.
 *
 * Authority comes from the `studio_users` table — never from JWT
 * `user_metadata`, which the user can edit (Security Contract v0.2 §1.1).
 *
 * V1 is owner-first: only `role = 'owner'` with `active = true` is authorized.
 * The role abstraction is preserved so Content / Fulfillment / Support roles can
 * be enabled later without rewriting every mutation (Master Spec §10.3.10).
 */

export type StudioIdentity = {
  /** auth.users.id — also the primary key of studio_users. */
  userId: string;
  role: Enums<"studio_role">;
  active: boolean;
  displayName: string | null;
};

/** Roles permitted to use Studio in v1. Widen deliberately, never by default. */
const V1_AUTHORIZED_ROLES: ReadonlySet<Enums<"studio_role">> = new Set(["owner"]);

/**
 * Resolve the calling request's Studio identity, or `null` when the caller is
 * signed out, is not a Studio user, is inactive, or holds a role that is not
 * enabled in v1.
 */
export async function getStudioIdentity(): Promise<StudioIdentity | null> {
  const supabase = await createClient();

  // getUser() revalidates the JWT against Supabase Auth. Never trust
  // getSession() for an authorization decision.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  // Read through the service-role client: the `studio_users` RLS policy is
  // itself owner-gated, so a would-be owner cannot read their own row until
  // they are already known to be an owner.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("studio_users")
    .select("user_id, role, active, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  if (!data.active) return null;
  if (!V1_AUTHORIZED_ROLES.has(data.role)) return null;

  return {
    userId: data.user_id,
    role: data.role,
    active: data.active,
    displayName: data.display_name,
  };
}

/**
 * Assert Studio authorization inside a Route Handler or Server Action.
 *
 * Every Studio mutation must call this server-side. A hidden button is never
 * authorization (Master Spec §10.3.5, §16.1).
 */
export async function requireStudioOwner(): Promise<StudioIdentity> {
  const identity = await getStudioIdentity();
  if (!identity) {
    throw new StudioAuthorizationError();
  }

  /**
   * MFA gate (Master Spec §17, Phase 9).
   *
   * Enforced HERE rather than only in the layout, because the layout is a
   * convenience and this is the boundary. Without it, a session that never
   * cleared its second factor could still drive every Studio mutation directly
   * through a Server Action, and the enrolled factor would be decorative.
   *
   * `mfaSatisfied()` returns true when the user has no verified factor, so this
   * is inert until the owner chooses to enrol — see `mfa.ts` for why enrolment
   * cannot be mandatory without locking the only owner out.
   */
  if (!(await mfaSatisfied())) {
    throw new StudioMfaRequiredError();
  }

  return identity;
}

/**
 * The caller IS the owner but has not cleared their second factor.
 *
 * Deliberately distinct from StudioAuthorizationError: the remedy is different
 * (enter a code, not sign in as someone else), and telling an owner "not
 * authorized" when they simply need their authenticator is a bad failure.
 */
export class StudioMfaRequiredError extends Error {
  readonly status = 403;

  constructor() {
    super("Second factor required");
    this.name = "StudioMfaRequiredError";
  }
}

export class StudioAuthorizationError extends Error {
  readonly status = 403;

  constructor() {
    super("Studio authorization required");
    this.name = "StudioAuthorizationError";
  }
}

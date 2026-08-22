import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import { createClient } from "@/lib/db/server";
import type { AccountIdentity } from "@/lib/account/session-types";

/**
 * Resolve the signed-in customer.
 *
 * Two distinct identities are involved and conflating them is a security bug:
 *
 *   auth.users.id   who is signed in
 *   customers.id    the commerce record that owns carts, orders and addresses
 *
 * A signed-in visitor may have no customer record yet (they have never checked
 * out), which is why this returns null rather than creating one. Nothing is
 * created as a side effect of a read.
 */

export type { AccountIdentity } from "@/lib/account/session-types";

export async function getAccountIdentity(): Promise<AccountIdentity | null> {
  const supabase = await createClient();

  // getUser() revalidates the JWT against Supabase Auth. Never trust
  // getSession() for an authorization decision.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const db = createAdminClient();
  const { data, error: customerError } = await db
    .from("customers")
    .select("id, email, first_name, last_name, phone, marketing_opt_in")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (customerError) throw customerError;
  if (!data) return null;

  return {
    authUserId: user.id,
    customerId: data.id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    phone: data.phone,
    marketingOptIn: data.marketing_opt_in,
  };
}

/**
 * The signed-in user's email, whether or not a customer record exists yet.
 *
 * Lets the account area greet someone who has signed in but never ordered,
 * instead of treating them as signed out.
 */
export async function getSignedInEmail(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

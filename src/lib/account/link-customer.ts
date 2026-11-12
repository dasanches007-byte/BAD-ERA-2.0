import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import { log } from "@/lib/observability/logger";

/**
 * Give a newly confirmed account its customer record.
 *
 * Called only after Supabase has verified the address (the customer clicked
 * the link in an email sent to it), so the account provably owns the email.
 * Orders are recorded against `customers` by email at payment
 * (`convert_paid_checkout`), so a customer who bought as a guest already has a
 * record: linking it is what makes those earlier orders appear in their
 * account. A record already linked to another sign-in is never taken over.
 *
 * Never throws: a failure here must not undo the sign-in that just
 * succeeded. The account then simply shows no order history until the next
 * confirmation, and the failure is logged.
 */
export async function linkCustomerRecord(user: { id: string; email?: string | null }): Promise<void> {
  const email = user.email?.trim().toLowerCase();
  if (!email) return;

  try {
    const db = createAdminClient();

    const { data: existing, error: readError } = await db
      .from("customers")
      .select("id, auth_user_id")
      .eq("email", email)
      .maybeSingle();
    if (readError) throw readError;

    if (existing) {
      if (existing.auth_user_id === user.id) return;
      if (existing.auth_user_id) {
        log.warn("account.link.already_linked", { customerId: existing.id });
        return;
      }
      const { error } = await db
        .from("customers")
        .update({ auth_user_id: user.id, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .is("auth_user_id", null);
      if (error) throw error;
      return;
    }

    const { error } = await db.from("customers").insert({ email, auth_user_id: user.id });
    // 23505: a concurrent confirmation or checkout created it a moment ago.
    if (error && error.code !== "23505") throw error;
  } catch (error) {
    log.error("account.link.failed", { error });
  }
}

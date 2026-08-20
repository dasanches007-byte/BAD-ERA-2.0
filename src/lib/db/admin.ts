import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/env/server";
import type { Database } from "@/lib/db/generated.types";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY.
 *
 * Legitimate callers (Security Contract v0.2):
 *   - verified Stripe / provider webhook handlers
 *   - the narrow SECURITY DEFINER commerce RPCs
 *   - trusted server-rendered storefront catalog + published content reads
 *
 * Rules:
 *   - Never import this from a Client Component. `server-only` makes that a
 *     build error, and the runtime guard below is a second line of defence.
 *   - Never hand the returned client to the browser or embed its results
 *     without deciding what is safe to expose. Supplier cost, provider
 *     credentials, internal notes and audit rows must never leave the server.
 *   - Authorization is the caller's job. This client has already skipped RLS,
 *     so a domain service must check Studio ownership or customer identity
 *     before acting.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient() was called in a browser context. The Supabase " +
        "service-role key is server-only.",
    );
  }

  const env = serverEnv();

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // A service-role client must never persist or refresh a user session.
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}

import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { serverEnv } from "@/lib/env/server";
import type { Database } from "@/lib/db/generated.types";

/**
 * Request-scoped Supabase client that carries the caller's session.
 *
 * Runs as `authenticated` (or `anon` when signed out), so every query is
 * subject to RLS. This is the correct client for "read the signed-in
 * customer's own orders" and for resolving Studio identity.
 *
 * It is NOT the right client for storefront catalog reads — `anon` has no
 * table grants. Use the admin client behind a domain service for trusted
 * public reads.
 */
export async function createClient() {
  const env = serverEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // `middleware.ts` refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

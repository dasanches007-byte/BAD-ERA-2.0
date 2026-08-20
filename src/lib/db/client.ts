"use client";

import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/db/generated.types";

/**
 * Browser Supabase client.
 *
 * SCOPE: Supabase Auth only — sign in, sign out, session refresh, password
 * reset. It runs as the `anon` / `authenticated` role.
 *
 * This client CANNOT be used to read the catalog. `anon` holds no public-table
 * grants by design (Security Contract v0.2): storefront data is rendered by
 * trusted Next.js server code. If you find yourself wanting a table read here,
 * move the read to a Server Component or a Route Handler instead of widening
 * database grants.
 */
export function createClient() {
  const env = publicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

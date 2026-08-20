import { NextResponse } from "next/server";

import { createClient } from "@/lib/db/server";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

export const runtime = "nodejs";

/**
 * Supabase Auth PKCE callback.
 *
 * Exchanges the one-time code for a session cookie, then redirects. The `next`
 * parameter is validated as a same-origin relative path so the callback cannot
 * be used as an open redirect.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirectPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=missing_code", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/?auth_error=exchange_failed", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

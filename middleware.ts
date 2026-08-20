import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase auth session on every matched request so Server
 * Components always observe a valid session, and applies baseline security
 * headers.
 *
 * This middleware is NOT an authorization boundary. Studio authorization is
 * enforced server-side in each route and mutation via
 * `requireStudioOwner()` — never by route matching alone
 * (Master Spec §16.1: "Never rely on hidden buttons as authorization").
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Before the environment is provisioned, pass through rather than 500 the
  // whole site. Route handlers still fail loudly when they need a real secret.
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // Touching getUser() is what performs the refresh. Do not remove.
    await supabase.auth.getUser();
  }

  applySecurityHeaders(response, request);
  return response;
}

function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );

  // Studio and preview must never be indexed (Master Spec §19).
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/studio") || pathname.startsWith("/api/preview")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
}

export const config = {
  matcher: [
    /*
     * Match everything except Next.js internals and static assets:
     * - _next/static, _next/image
     * - favicon and common image/font extensions
     * The Stripe webhook is deliberately excluded: it must reach the route
     * handler with an untouched raw body and carries no session cookie.
     */
    "/((?!_next/static|_next/image|api/webhooks|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};

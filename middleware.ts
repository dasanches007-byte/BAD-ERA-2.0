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
  /**
   * A fresh nonce per request. Reusing one across requests would let an
   * attacker who has seen a page's HTML craft a script tag the policy accepts.
   */
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Next reads `x-nonce` and stamps it onto the scripts it renders, so the
  // header has to be on the REQUEST, not just the response. Next also wants to
  // see the policy itself on the request before it will apply the nonce, which
  // is why the same value is set in both places.
  const csp = contentSecurityPolicy(nonce, supabaseOrigin());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

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
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // Touching getUser() is what performs the refresh. Do not remove.
    await supabase.auth.getUser();
  }

  applySecurityHeaders(response, request, csp);
  return response;
}

/**
 * Build the Content-Security-Policy (Master Spec §17).
 *
 * Nonce-based, not `unsafe-inline`. Next.js injects inline bootstrap scripts on
 * every page, so a policy without a nonce has to allow all inline script —
 * which is precisely the class of injection CSP exists to stop. The nonce is
 * generated per request, handed to Next via `x-nonce`, and only scripts
 * carrying it execute.
 *
 * `strict-dynamic` lets those nonced bootstrap scripts load the chunks they
 * need without enumerating every hashed filename. Modern browsers then IGNORE
 * the host allowlist for scripts; the `'self'` fallback is there for older ones.
 *
 * Style is the one deliberate `unsafe-inline`. Next.js and Tailwind emit inline
 * <style> during hydration and for critical CSS, and a style nonce breaks that.
 * Inline style is a far weaker vector than inline script — it cannot exfiltrate
 * on its own — so the trade is taken knowingly rather than by omission.
 */
function contentSecurityPolicy(nonce: string, supabaseOrigin: string | null): string {
  const isDev = process.env.NODE_ENV !== "production";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],

    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "https://js.stripe.com",
      // The dev bundler evaluates generated code; production never does.
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],

    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],

    // Storage-hosted media plus the blob/data URLs next/image and upload
    // previews produce. No open wildcard.
    "img-src": [
      "'self'",
      "blob:",
      "data:",
      ...(supabaseOrigin ? [supabaseOrigin] : []),
    ],
    "media-src": ["'self'", "blob:", ...(supabaseOrigin ? [supabaseOrigin] : [])],

    // Supabase needs both https and wss (realtime); Stripe needs its API.
    "connect-src": [
      "'self'",
      ...(supabaseOrigin
        ? [supabaseOrigin, supabaseOrigin.replace(/^https:/, "wss:")]
        : []),
      "https://api.stripe.com",
      ...(isDev ? ["ws:", "http://localhost:*"] : []),
    ],

    // Stripe Checkout and 3DS render in a frame.
    "frame-src": ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],

    // The Site Editor previews the draft in a same-origin iframe, so 'self'
    // must be allowed here even though X-Frame-Options says DENY to everyone
    // else. frame-ancestors is what modern browsers actually enforce.
    "frame-ancestors": ["'self'"],

    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
  };

  const policy = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");

  // upgrade-insecure-requests has no place on http://localhost.
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}

function supabaseOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  csp: string,
) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");
  // Cross-origin isolation hygiene: keep this origin's window references and
  // resource loads from being usable as a side channel by another site.
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  response.headers.set("Content-Security-Policy", csp);

  /**
   * HSTS, production only.
   *
   * Setting this on http://localhost would pin the browser to https for
   * localhost across every project on the machine — a genuinely painful thing
   * to undo. `preload` is deliberately omitted: it is a one-way door that
   * requires the domain and every subdomain to be https-only forever, and that
   * is the owner's decision to make once the domain is settled, not a default.
   */
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains",
    );
  }

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

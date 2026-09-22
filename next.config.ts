import type { NextConfig } from "next";

/**
 * Supabase Storage host for the Media Library.
 *
 * Derived from NEXT_PUBLIC_SUPABASE_URL so the allowlist follows the project
 * rather than hard-coding one ref. Without this, every `next/image` pointing at
 * an uploaded asset fails at runtime with "hostname is not configured".
 */
function supabaseImagePattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    const { hostname } = new URL(url);
    return [
      {
        protocol: "https" as const,
        hostname,
        // Public storefront media only. The private bucket is never served
        // through the image optimiser.
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    // A malformed URL is caught by env validation; do not break the build here.
    return [];
  }
}

/**
 * The public address of this dev server when it runs inside GitHub Codespaces,
 * or nothing anywhere else.
 *
 * Codespaces reaches the dev server through a port-forwarding proxy, so the
 * browser's Origin is `<codespace>-3000.app.github.dev` while the request Next
 * sees carries `x-forwarded-host: localhost:3000`. Two Next.js guards treat
 * that mismatch as an attack:
 *
 *   - the Server Actions CSRF check aborts every action — sign-in included —
 *     with a bare "Invalid Server Actions request" (reproduced: HTTP 500)
 *   - the dev server's cross-site block refuses the live-reload connection
 *
 * Both are right to be strict, so the allowance is as narrow as it can be:
 * exactly this one Codespace's address, read from variables GitHub sets inside
 * the Codespace. Outside a Codespace the list is empty, which means production
 * and local builds keep Next's default same-origin-only behaviour untouched.
 * A wildcard like `*.app.github.dev` would let ANY Codespace on GitHub post
 * Server Actions to this one.
 */
function codespaceOrigins(): string[] {
  const name = process.env.CODESPACE_NAME;
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  if (!name || !domain) return [];
  return [`${name}-3000.${domain}`];
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseImagePattern(),
  },
  // Empty outside GitHub Codespaces — see codespaceOrigins().
  allowedDevOrigins: codespaceOrigins(),
  experimental: {
    serverActions: {
      allowedOrigins: codespaceOrigins(),
    },
  },
};

export default nextConfig;

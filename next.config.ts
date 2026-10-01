import { readFileSync } from "node:fs";

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
/**
 * GitHub writes every Codespace's default variables to this file. It is the
 * fallback for when the process that started `next dev` did not inherit them.
 */
const CODESPACES_ENV_FILE =
  "/workspaces/.codespaces/shared/environment-variables.json";

function readCodespaceVars(): { name: string; domain: string } {
  let name = process.env.CODESPACE_NAME ?? "";
  let domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? "";

  if (!name || !domain) {
    try {
      const vars = JSON.parse(readFileSync(CODESPACES_ENV_FILE, "utf8")) as Record<
        string,
        unknown
      >;
      if (!name && typeof vars.CODESPACE_NAME === "string") {
        name = vars.CODESPACE_NAME;
      }
      if (!domain && typeof vars.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN === "string") {
        domain = vars.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
      }
    } catch {
      // No file: not a Codespace, or not one that writes it. Nothing to add.
    }
  }

  return { name, domain };
}

/**
 * Resolution order, each step only filling what the previous left empty:
 *
 *   1. the process environment
 *   2. GitHub's environment-variables.json inside the Codespace
 *   3. for the DOMAIN only, GitHub's current forwarding domain
 *
 * Found the hard way: in a real Codespace the first version, which required
 * both variables from the environment, allowed nothing — sign-in still failed
 * with E80 — while a simulated Codespace with both variables set passed. The
 * startup script printed a correct-looking address throughout because it
 * already defaulted the domain; this function did not.
 *
 * The domain default only ever applies once a Codespace NAME has been found,
 * so production and local builds still resolve to nothing.
 */
function codespaceOrigins(): string[] {
  const { name, domain: rawDomain } = readCodespaceVars();
  if (!name) return [];
  const domain = rawDomain || "app.github.dev";

  // Exact host only. Anything that is not a plain DNS name is refused rather
  // than passed to Next's matcher, where `*` would become a wildcard.
  if (!/^[a-z0-9-]+$/i.test(name) || !/^[a-z0-9.-]+$/i.test(domain)) return [];

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

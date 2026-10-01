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
    const { hostname, protocol } = new URL(url);
    return [
      {
        // https for every hosted project; http only ever for a local stack
        // (`supabase start` serves on http://127.0.0.1:54321).
        protocol: (protocol === "http:" ? "http" : "https") as "http" | "https",
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
 * True only when Supabase itself is running on this machine.
 *
 * Next refuses to optimise images whose host resolves to a private address,
 * as SSRF protection. A local Supabase stack is exactly that, so photos would
 * never render in local development. The exemption is tied to the configured
 * Supabase URL being loopback — a hosted project never qualifies — and
 * `remotePatterns` still limits the optimiser to that one host's public
 * storage path.
 */
function supabaseIsLocal(): boolean {
  try {
    const { hostname } = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return false;
  }
}

/**
 * Server Actions inside GitHub Codespaces.
 *
 * Codespaces reaches the dev server through a port-forwarding proxy, and Next's
 * Server Actions CSRF check compares the request's Origin with its
 * `x-forwarded-host`. Behind that proxy they never agree, so every action —
 * sign-in included — aborts with a bare "Invalid Server Actions request" (E80).
 *
 * Which way round they disagree is the part that went wrong twice. The first
 * two fixes assumed the browser's Origin (`<codespace>-3000.app.github.dev`)
 * arrived intact with `x-forwarded-host: localhost:3000`, and allowed the
 * Codespace address. A real Codespace sends the reverse: the proxy rewrites
 * Origin to `localhost:3000` and forwards the Codespace address as
 * `x-forwarded-host`. Next logs exactly that, and reproducing it here returned
 * HTTP 500 while the simulated direction passed. So the fix that matters is
 * accepting `localhost:3000` as an Origin — inside a Codespace only.
 *
 * Why that is safe there, and only there: production never runs inside a
 * Codespace, so outside one this list is empty and Next keeps its default
 * same-origin-only check. Inside one, the forwarded port is private to the
 * owner's GitHub login, and the Supabase session cookie is SameSite=Lax, so a
 * cross-site POST carries no session to act with. The Codespace's own address
 * stays on the list for a proxy that does pass Origin through.
 *
 * Never a wildcard: `*.app.github.dev` would let ANY Codespace on GitHub post
 * Server Actions to this one.
 */

/**
 * GitHub writes every Codespace's default variables to this file. It is the
 * fallback for when the process that started `next dev` did not inherit them.
 */
const CODESPACES_ENV_FILE =
  "/workspaces/.codespaces/shared/environment-variables.json";

/** The port `.devcontainer` forwards and `next dev` listens on. */
const DEV_PORT = 3000;

type CodespaceVars = { inCodespace: boolean; name: string; domain: string };

/**
 * Resolution order, each step only filling what the previous left empty:
 *
 *   1. the process environment
 *   2. GitHub's environment-variables.json inside the Codespace
 *   3. for the DOMAIN only, GitHub's current forwarding domain
 *
 * `CODESPACES=true` alone is enough to know we are in one: the localhost
 * allowance does not need the name, so sign-in no longer depends on the name
 * reaching `next dev` at all.
 */
function readCodespaceVars(): CodespaceVars {
  let name = process.env.CODESPACE_NAME ?? "";
  let domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? "";
  let flagged = process.env.CODESPACES === "true";

  if (!name || !domain || !flagged) {
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
      if (vars.CODESPACES === "true") flagged = true;
    } catch {
      // No file: not a Codespace, or not one that writes it. Nothing to add.
    }
  }

  return { inCodespace: flagged || name !== "", name, domain };
}

/**
 * This Codespace's own public host, or null. Exact host only: anything that is
 * not a plain DNS name is refused rather than passed to Next's matcher, where
 * `*` would become a wildcard.
 */
function codespaceHost({ name, domain }: CodespaceVars): string | null | "malformed" {
  if (!name) return null;
  const resolved = domain || "app.github.dev";
  if (!/^[a-z0-9-]+$/i.test(name) || !/^[a-z0-9.-]+$/i.test(resolved)) return "malformed";
  return `${name}-${DEV_PORT}.${resolved}`;
}

const codespace = readCodespaceVars();
const host = codespaceHost(codespace);
// A malformed name or domain means the environment is not what we think it is:
// allow nothing rather than guess.
const trusted = codespace.inCodespace && host !== "malformed";

/** Origins whose Server Actions are accepted despite a host mismatch. */
const serverActionOrigins: string[] = trusted
  ? [...(host ? [host] : []), `localhost:${DEV_PORT}`]
  : [];

/**
 * Dev-only resources (`/_next`, live reload) requested from the Codespace
 * address. localhost is always allowed by Next, so only the host is listed.
 */
const devOrigins: string[] = trusted && host ? [host] : [];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseImagePattern(),
    dangerouslyAllowLocalIP: supabaseIsLocal(),
  },
  // Both empty outside GitHub Codespaces — see readCodespaceVars().
  allowedDevOrigins: devOrigins,
  experimental: {
    serverActions: {
      allowedOrigins: serverActionOrigins,
      // Photo uploads go through a Server Action (media-actions.ts), and the
      // default 1 MB cap refused an ordinary phone photo. Matches the 25 MB
      // limit the action and the storage bucket already enforce. Vercel caps
      // a function request at 4.5 MB on its own — see LAUNCH_READINESS.md.
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;

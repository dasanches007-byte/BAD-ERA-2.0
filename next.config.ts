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

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseImagePattern(),
  },
};

export default nextConfig;

/**
 * Reduce a caller-supplied `next` parameter to a safe same-origin path.
 *
 * An auth callback that redirects to an attacker-controlled destination is an
 * open redirect: it lends BAD ERA's domain to a phishing flow and can leak the
 * referrer. Only a single-slash relative path is accepted; everything else
 * falls back.
 *
 * Rejected: "//evil.com", "https://evil.com", "http:/evil.com", "\\evil.com",
 * backslash-normalising browsers, and anything not starting with "/".
 */
export function safeRedirectPath(
  requested: string | null | undefined,
  fallback = "/account",
): string {
  if (!requested) return fallback;

  // Browsers normalise backslashes to forward slashes in some contexts, so
  // treat them as equivalent when validating.
  const normalised = requested.replace(/\\/g, "/");

  if (!normalised.startsWith("/")) return fallback;
  if (normalised.startsWith("//")) return fallback;

  // Defence in depth: reject anything that still parses as absolute.
  try {
    const parsed = new URL(normalised, "https://bad-era.invalid");
    if (parsed.origin !== "https://bad-era.invalid") return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}

import "server-only";

/**
 * Structured server logging (Master Spec §17).
 *
 * Two requirements drive this: logs must be structured enough to search when
 * something goes wrong at 2am, and they must never contain full payment data or
 * unnecessary PII.
 *
 * The redaction is the part that matters. `console.error("failed", error)` on a
 * Stripe or Supabase error object will happily print an email, an address, or a
 * card object into a log aggregator that has none of the access controls the
 * database has. So every value passed here goes through `redact()` — deny by
 * key name, not by remembering to strip fields at each call site, because the
 * call site is exactly where it gets forgotten.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Keys whose VALUES are never logged.
 *
 * Both the key and the needle are normalised to lowercase alphanumerics before
 * matching, so ONE entry catches every spelling a value arrives under:
 * `first_name` from a Postgres row, `firstName` from a domain object,
 * `FirstName` from a provider payload. Without that normalisation the snake and
 * camel spellings are different strings and only one of them is caught — which
 * is exactly the bug this list exists to prevent.
 *
 * Over-matching is the safe direction: a redacted field that was harmless costs
 * a debugging step, while a logged card number is a breach.
 */
const REDACTED_KEYS = [
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "service_role",
  "email",
  "phone",
  "card",
  "cvc",
  "iban",
  "account_number",
  "routing",
  "address",
  "street",
  "postal",
  "zip",
  "first_name",
  "last_name",
  "full_name",
  "client_secret",
  "credential",
];

/** Values that look like a secret regardless of the key they arrived under. */
const SECRET_VALUE_PATTERNS = [
  /\bsk_(live|test)_[A-Za-z0-9]+/g, // Stripe secret key
  /\bwhsec_[A-Za-z0-9]+/g, // Stripe webhook secret
  /\bre_[A-Za-z0-9_-]{20,}/g, // Resend key
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT
  /\b\d{13,19}\b/g, // bare PAN-length digit run
];

const MAX_DEPTH = 4;
const MAX_STRING = 512;

function scrubString(value: string): string {
  let out = value;
  for (const pattern of SECRET_VALUE_PATTERNS) {
    out = out.replace(pattern, "[redacted]");
  }
  return out.length > MAX_STRING ? `${out.slice(0, MAX_STRING)}…[truncated]` : out;
}

/** Lowercase alphanumerics only, so snake_case and camelCase collapse together. */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const NORMALIZED_REDACTED_KEYS = REDACTED_KEYS.map(normalizeKey);

function isRedactedKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return NORMALIZED_REDACTED_KEYS.some((needle) => normalized.includes(needle));
}

/**
 * Recursively strip sensitive values.
 *
 * Errors are unwrapped to name/message/code rather than logged whole: a
 * PostgrestError or StripeError carries request payloads and row data on
 * properties nobody remembers are there.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > MAX_DEPTH) return "[depth-limit]";

  if (typeof value === "string") return scrubString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return "[fn]";

  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrubString(value.message),
      // A stack is diagnostic and carries no user data; the message might.
      stack: value.stack ? scrubString(value.stack).split("\n").slice(0, 6) : undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redact(item, depth + 1));
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(source)) {
      out[key] = isRedactedKey(key) ? "[redacted]" : redact(item, depth + 1);
    }
    return out;
  }

  return "[unknown]";
}

export type LogContext = Record<string, unknown>;

function emit(level: LogLevel, event: string, context?: LogContext): void {
  const line = {
    ts: new Date().toISOString(),
    level,
    service: "bad-era",
    event,
    ...(context ? (redact(context) as LogContext) : {}),
  };

  // One JSON object per line: greppable in `vercel logs`, parseable by any
  // aggregator, and it survives being interleaved across concurrent requests.
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const log = {
  debug: (event: string, context?: LogContext) => {
    if (process.env.NODE_ENV === "production") return;
    emit("debug", event, context);
  },
  info: (event: string, context?: LogContext) => emit("info", event, context),
  warn: (event: string, context?: LogContext) => emit("warn", event, context),
  error: (event: string, context?: LogContext) => emit("error", event, context),
};

/**
 * A correlation id for one request.
 *
 * Prefers the platform's own id so a BAD ERA log line can be matched against
 * the Vercel request log without a second lookup.
 */
export function requestId(headers: Headers): string {
  return (
    headers.get("x-vercel-id") ??
    headers.get("x-request-id") ??
    crypto.randomUUID()
  );
}

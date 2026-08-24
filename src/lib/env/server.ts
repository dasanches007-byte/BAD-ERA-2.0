import "server-only";

import { z } from "zod";

/**
 * Server-side environment contract.
 *
 * Importing this module from a Client Component is a build error: `server-only`
 * poisons the client graph. That is deliberate — the service-role key and the
 * Stripe secret must never be reachable from a browser bundle
 * (Security Contract v0.2, Master Spec §16.1, §17).
 *
 * The contract is split by INTEGRATION rather than validated as one block.
 * A single all-or-nothing schema meant no server route could run until every
 * secret existed, so the owner could not sign in to Studio to configure the
 * store until Stripe and Resend were already configured — and Resend is not
 * used until Phase 7. Each group is now validated at its own point of use, and
 * fails loudly there naming exactly what is missing.
 */

/** Always required: without these nothing can serve a request at all. */
const baseSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: "NEXT_PUBLIC_SUPABASE_URL must be the full https URL of the project",
  }),

  /**
   * Publishable (anon) key. Note that `anon` holds no public-table grants —
   * the storefront renders from trusted server code. This key exists for
   * Supabase Auth flows, not for anonymous table reads.
   */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),

  /** SERVER ONLY. Bypasses RLS. Never send to the browser. */
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  /** Canonical public origin, used for Stripe redirect URLs and emails. */
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),

});

/** Required only on Stripe code paths. */
const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, "STRIPE_WEBHOOK_SECRET is required"),
});

/** Required only on transactional email paths (Phase 7). */
const resendSchema = z.object({
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.email("RESEND_FROM_EMAIL must be a valid address"),
});

export type ServerEnv = z.infer<typeof baseSchema>;
export type StripeEnv = z.infer<typeof stripeSchema>;
export type ResendEnv = z.infer<typeof resendSchema>;

function parseOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  label: string,
): z.infer<T> {
  const parsed = schema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Missing ${label} configuration. Fill these in .env.local:\n${details}`,
  );
}

let cachedBase: ServerEnv | undefined;
let cachedStripe: StripeEnv | undefined;
let cachedResend: ResendEnv | undefined;

export function serverEnv(): ServerEnv {
  cachedBase ??= parseOrThrow(baseSchema, "core server");
  return cachedBase;
}

/** Call from Stripe code paths only. Throws naming the missing Stripe keys. */
export function stripeEnv(): StripeEnv {
  cachedStripe ??= parseOrThrow(stripeSchema, "Stripe");
  return cachedStripe;
}

/** Call from email code paths only (Phase 7). */
export function resendEnv(): ResendEnv {
  cachedResend ??= parseOrThrow(resendSchema, "Resend");
  return cachedResend;
}

/**
 * Non-throwing status for diagnostic surfaces.
 *
 * The Studio dashboard reports whether each integration is CONFIGURED without
 * ever revealing a secret value, and without taking the page down when one is
 * absent.
 */
export function serverEnvStatus(): {
  core: boolean;
  stripe: boolean;
  resend: boolean;
  missing: string[];
} {
  const core = baseSchema.safeParse(process.env);
  const stripe = stripeSchema.safeParse(process.env);
  const resend = resendSchema.safeParse(process.env);

  const missing = [
    ...(core.success ? [] : core.error.issues.map((i) => i.path.join("."))),
    ...(stripe.success ? [] : stripe.error.issues.map((i) => i.path.join("."))),
    ...(resend.success ? [] : resend.error.issues.map((i) => i.path.join("."))),
  ];

  return {
    core: core.success,
    stripe: stripe.success,
    resend: resend.success,
    missing,
  };
}

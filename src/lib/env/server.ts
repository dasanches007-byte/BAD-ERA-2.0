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
 * Variables are validated lazily on first access so that `next build` and
 * `next lint` do not require a fully provisioned environment. The first server
 * code path that actually needs a secret fails loudly, with every missing key
 * named at once.
 */

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  /** Public Supabase project URL. Safe to expose; still validated here. */
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

  /** SERVER ONLY. */
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),

  /** SERVER ONLY. Verifies raw webhook bodies. */
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, "STRIPE_WEBHOOK_SECRET is required"),

  /** Canonical public origin, used for Stripe redirect URLs and emails. */
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),

  /**
   * Resend is not wired until Phase 7. Optional so earlier phases can run
   * without it; the email service asserts its presence at point of use.
   */
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.email().optional(),

  /** Signed Site Editor preview access (Phase 4). */
  PREVIEW_SECRET: z.string().min(16).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid server environment. Copy .env.example to .env.local and fill in:\n${details}`,
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * Non-throwing check for health/diagnostic surfaces (the Studio settings screen
 * shows integration health without ever revealing a secret value).
 */
export function serverEnvStatus(): {
  ok: boolean;
  missing: string[];
} {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (parsed.success) return { ok: true, missing: [] };

  return {
    ok: false,
    missing: parsed.error.issues.map((issue) => issue.path.join(".")),
  };
}

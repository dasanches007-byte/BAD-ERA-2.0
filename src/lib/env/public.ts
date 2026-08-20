import { z } from "zod";

/**
 * Environment values that are safe in a browser bundle.
 *
 * Every key here MUST be `NEXT_PUBLIC_*` and MUST be genuinely public.
 * Never widen this file to reach a secret — that is what `src/lib/env/server.ts`
 * is for, and it is guarded by `server-only`.
 *
 * Next.js inlines `NEXT_PUBLIC_*` at build time only for statically analysable
 * member expressions, so each one is read explicitly rather than through a
 * dynamic index.
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cached: PublicEnv | undefined;

export function publicEnv(): PublicEnv {
  if (cached) return cached;

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid public environment:\n${details}`);
  }

  cached = parsed.data;
  return cached;
}

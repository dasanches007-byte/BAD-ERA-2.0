"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/db/server";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

/**
 * Email + password authentication.
 *
 * This establishes a browser session. It grants NO authority by itself:
 * Studio authorization is a separate check against `studio_users`, performed
 * again on every Studio read and mutation. Signing in and being the owner are
 * deliberately two different things.
 */

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export type SignInResult = { ok: false; message: string };

export async function signInAction(
  formData: FormData,
): Promise<SignInResult | never> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Deliberately generic. Distinguishing "no such account" from "wrong
    // password" turns the form into an account-enumeration oracle.
    console.warn("[bad-era] sign-in failed", { message: error.message });
    return { ok: false, message: "That email and password do not match." };
  }

  // redirect() throws, so it must sit outside the try/catch above and after
  // the session cookie has been written.
  redirect(safeRedirectPath(parsed.data.next, "/studio"));
}

export async function signOutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

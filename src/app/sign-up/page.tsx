import { redirect } from "next/navigation";

import { AccountForm } from "@/components/auth/account-form";
import { AuthLink, AuthPage } from "@/components/auth/auth-page";
import { signUpAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/db/server";
import { emailConfigured } from "@/lib/email/resend";

export const metadata = {
  title: "Create an account — BAD ERA",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Create a customer account. An account is never needed to buy (checkout
 * asks only for an email); it keeps orders, returns and addresses in one
 * place. The account opens once its email is confirmed from the inbox.
 */
export default async function SignUpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/account");

  const open = emailConfigured();

  return (
    <AuthPage
      title="Create an account"
      intro="Keep your orders, returns and addresses in one place. You don't need an account to order."
    >
      {open ? (
        <AccountForm
          action={signUpAction}
          submitLabel="Create account"
          pendingLabel="Creating…"
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            {
              name: "password",
              label: "Password",
              type: "password",
              autoComplete: "new-password",
              hint: "At least 8 characters.",
            },
          ]}
        />
      ) : (
        <p className="border-l border-line-strong pl-4 text-sm leading-relaxed text-ink">
          Accounts can&apos;t be created just yet. You don&apos;t need one to order: checkout only
          asks for your email.
        </p>
      )}
      <div className="mt-8 space-y-3 text-center text-sm text-ink-muted">
        <p>
          Already have an account? <AuthLink href="/sign-in?next=/account">Sign in</AuthLink>
        </p>
      </div>
    </AuthPage>
  );
}

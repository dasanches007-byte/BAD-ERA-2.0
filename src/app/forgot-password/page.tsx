import { AccountForm } from "@/components/auth/account-form";
import { AuthLink, AuthPage } from "@/components/auth/auth-page";
import { requestPasswordResetAction } from "@/lib/auth/actions";

export const metadata = {
  title: "Forgot your password — BAD ERA",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Forgotten password: we email the account a link to choose a new one. The
 * page answers the same whether or not the address has an account.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthPage
      title="Forgot your password?"
      intro="Enter your email and we'll send you a link to choose a new one."
    >
      <AccountForm
        action={requestPasswordResetAction}
        submitLabel="Send link"
        pendingLabel="Sending…"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />
      <div className="mt-8 space-y-3 text-center text-sm text-ink-muted">
        <p>
          Remembered it? <AuthLink href="/sign-in?next=/account">Sign in</AuthLink>
        </p>
      </div>
    </AuthPage>
  );
}

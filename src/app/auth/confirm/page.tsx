import { AccountForm } from "@/components/auth/account-form";
import { AuthLink, AuthPage } from "@/components/auth/auth-page";
import { confirmEmailLinkAction } from "@/lib/auth/actions";

export const metadata = {
  title: "Your account — BAD ERA",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Where the links in account emails land. Opening the page changes nothing:
 * the one-time token is used only when the customer presses the button,
 * because some mail services open every link in an email to scan it, and a
 * page that used the token on open would let the scanner spend it first.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash: tokenHash, type, next } = await searchParams;
  const recovery = type === "recovery";

  if (!tokenHash || !type) {
    return (
      <AuthPage title="That link is incomplete" intro="Open the link from the email again, or ask for a new one.">
        <div className="space-y-3 text-center text-sm text-ink-muted">
          <p>
            <AuthLink href="/forgot-password">Reset your password</AuthLink>
          </p>
          <p>
            <AuthLink href="/sign-in?next=/account">Sign in</AuthLink>
          </p>
        </div>
      </AuthPage>
    );
  }

  return (
    <AuthPage
      title={recovery ? "Choose a new password" : "Confirm your email"}
      intro={
        recovery
          ? "Continue to choose a new password for your account."
          : "One more step: confirm your email to open your account."
      }
    >
      <AccountForm
        action={confirmEmailLinkAction}
        submitLabel={recovery ? "Continue" : "Confirm email"}
        pendingLabel="One moment…"
        fields={[]}
        hidden={{ token_hash: tokenHash, type, next: next ?? "/account" }}
      />
    </AuthPage>
  );
}

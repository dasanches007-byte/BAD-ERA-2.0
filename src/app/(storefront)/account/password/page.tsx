import { AccountForm } from "@/components/auth/account-form";
import { setNewPasswordAction } from "@/lib/auth/actions";

export const metadata = { title: "Password", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Choose a new password: where a reset link lands (signed in by the link),
 * and where a signed-in customer changes theirs. The account layout has
 * already sent anyone signed out to sign in.
 */
export default async function AccountPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;

  return (
    <section className="max-w-md">
      <h2 className="label text-ink-subtle">{reset ? "Choose a new password" : "Change your password"}</h2>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        {reset
          ? "You're signed in from the link we emailed you. Choose a new password to finish."
          : "Choose a new password for signing in."}
      </p>
      <div className="mt-8">
        <AccountForm
          action={setNewPasswordAction}
          submitLabel="Save password"
          pendingLabel="Saving…"
          fields={[
            {
              name: "password",
              label: "New password",
              type: "password",
              autoComplete: "new-password",
              hint: "At least 8 characters.",
            },
            { name: "confirm", label: "New password, again", type: "password", autoComplete: "new-password" },
          ]}
          after={{ label: "Go to your account", href: "/account" }}
        />
      </div>
    </section>
  );
}

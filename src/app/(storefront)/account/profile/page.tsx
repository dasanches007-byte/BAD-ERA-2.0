import { ProfileForm } from "@/components/account/profile-form";
import { getAccountIdentity } from "@/lib/account/session";

export const metadata = { title: "Profile", robots: { index: false } };

export default async function AccountProfilePage() {
  const identity = await getAccountIdentity();

  return (
    <section>
      <h2 className="font-display text-display-sm text-ink-strong">Profile</h2>
      {identity ? (
        <ProfileForm identity={identity} />
      ) : (
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
          Your profile is created with your first order.
        </p>
      )}
    </section>
  );
}

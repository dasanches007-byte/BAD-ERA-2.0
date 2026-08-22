import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getSignedInEmail } from "@/lib/account/session";

export const dynamic = "force-dynamic";

const TABS = [
  { label: "Overview", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Returns", href: "/account/returns" },
  { label: "Support", href: "/account/support" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Profile", href: "/account/profile" },
];

/**
 * Account area.
 *
 * Signed-out visitors go to sign-in with a return path, rather than seeing an
 * empty account. Each page still resolves identity itself — this layout is
 * convenience, not the authorization boundary.
 */
export default async function AccountLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const email = await getSignedInEmail();
  if (!email) redirect("/sign-in?next=/account");

  return (
    <div className="shell py-14 lg:py-20">
      <header className="border-b border-line pb-8">
        <p className="label text-ink-subtle">Account</p>
        <h1 className="mt-4 font-display text-display-md text-ink-strong">
          {email}
        </h1>
      </header>

      <nav aria-label="Account" className="border-b border-line">
        <ul className="flex gap-8 overflow-x-auto">
          {TABS.map((tab) => (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                className="label -mb-px inline-block border-b-2 border-transparent pb-4 pt-5 text-ink-subtle transition-colors hover:text-ink"
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="pt-10">{children}</div>
    </div>
  );
}

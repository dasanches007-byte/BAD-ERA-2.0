import Link from "next/link";

import { ContentPage } from "@/components/storefront/content-page";
import { getAccountIdentity } from "@/lib/account/session";
import { getPublishedSections } from "@/lib/cms/pages";

export const metadata = {
  title: "Support",
  description: "Get help with an order, a return, or a question about a piece.",
};

// Dynamic so the per-request CSP nonce reaches this page's scripts.
export const dynamic = "force-dynamic";

/**
 * Public support entry (Master Spec §9).
 *
 * Two audiences, and the difference matters. A signed-in customer gets a
 * threaded case tied to their orders, which lives at `/account/support`. A
 * signed-out visitor cannot have that — a case has to belong to a customer
 * record, and inventing one from an email in a public form would let anyone
 * open cases against an address they do not control.
 *
 * So this page routes rather than duplicating the form: it is the door, and it
 * is honest about which side of it you are on.
 */
export default async function SupportPage() {
  const identity = await getAccountIdentity().catch(() => null);

  // If the owner has published support copy in Studio, that wins entirely.
  const published = await getPublishedSections("support").catch(() => null);
  if (published && published.length > 0) {
    return <ContentPage pageKey="support" title="Support" />;
  }

  return (
    <section className="shell py-20 lg:py-28">
      <div className="max-w-2xl">
        <p className="label text-ink-subtle">Support</p>
        <h1 className="mt-6 font-display text-display-md text-ink-strong">
          We&rsquo;ll help
        </h1>
        <p className="mt-6 text-sm leading-relaxed text-ink-muted">
          Questions about an order, a return, sizing or a piece — send them over
          and a person will reply.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <Panel
            title={identity ? "Open a case" : "Sign in to open a case"}
            body={
              identity
                ? "Your orders are already linked, so we can see what you're asking about."
                : "Signing in links your message to your order history, so we can answer without a back-and-forth."
            }
            href={identity ? "/account/support" : "/sign-in?next=/account/support"}
            label={identity ? "Go to support" : "Sign in"}
          />
          <Panel
            title="Start a return"
            body="Within the return window, request a return against a delivered order."
            href={identity ? "/account/returns" : "/sign-in?next=/account/returns"}
            label="Returns"
          />
        </div>

        {/*
          No email address, phone number or response-time promise is printed
          here. Every one of those is an operational commitment the owner has
          not made, and a support page that promises a channel nobody is
          watching is worse than one that does not (Master Spec §9.1).
        */}
        <p className="mt-12 text-xs leading-relaxed text-ink-subtle">
          Shipping and returns terms are on the{" "}
          <Link href="/shipping" className="text-ink-muted underline underline-offset-4 hover:text-ink">
            shipping
          </Link>{" "}
          and{" "}
          <Link href="/returns-policy" className="text-ink-muted underline underline-offset-4 hover:text-ink">
            returns
          </Link>{" "}
          pages.
        </p>
      </div>
    </section>
  );
}

function Panel({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href: string;
  label: string;
}) {
  return (
    <div className="hairline flex flex-col justify-between bg-surface-raised p-7">
      <div>
        <h2 className="text-sm text-ink">{title}</h2>
        <p className="mt-3 text-xs leading-relaxed text-ink-subtle">{body}</p>
      </div>
      <Link
        href={href}
        className="label mt-8 inline-flex items-center self-start border border-line-strong px-5 py-2.5 text-ink transition-colors hover:border-ink hover:bg-ink hover:text-inverse-ink"
      >
        {label}
      </Link>
    </div>
  );
}

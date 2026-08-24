import { ContentPage } from "@/components/storefront/content-page";

export const metadata = { title: "Terms" };

// Dynamic so the per-request CSP nonce reaches this page's scripts, and so a
// publish from Studio is live without a deploy.
export const dynamic = "force-dynamic";

/**
 * Terms — content is managed in Studio (Site Editor -> terms).
 *
 * Deliberately no fallback copy: see `ContentPage` for why placeholder legal
 * wording is worse than an honest "not published yet".
 */
export default function TermsPage() {
  return <ContentPage pageKey="terms" title="Terms" />;
}

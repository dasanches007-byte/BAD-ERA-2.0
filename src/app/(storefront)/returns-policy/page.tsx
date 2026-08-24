import { ContentPage } from "@/components/storefront/content-page";

export const metadata = { title: "Returns policy" };

// Dynamic so the per-request CSP nonce reaches this page's scripts, and so a
// publish from Studio is live without a deploy.
export const dynamic = "force-dynamic";

/**
 * Returns policy — content is managed in Studio (Site Editor -> returns-policy).
 *
 * Deliberately no fallback copy: see `ContentPage` for why placeholder legal
 * wording is worse than an honest "not published yet".
 */
export default function ReturnsPolicyPage() {
  return <ContentPage pageKey="returns-policy" title="Returns policy" />;
}

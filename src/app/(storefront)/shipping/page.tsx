import { ContentPage } from "@/components/storefront/content-page";

export const metadata = { title: "Shipping" };

// Dynamic so the per-request CSP nonce reaches this page's scripts, and so a
// publish from Studio is live without a deploy.
export const dynamic = "force-dynamic";

/**
 * Shipping — content is managed in Studio (Site Editor -> shipping).
 *
 * Deliberately no fallback copy: see `ContentPage` for why placeholder legal
 * wording is worse than an honest "not published yet".
 */
export default function ShippingPage() {
  return <ContentPage pageKey="shipping" title="Shipping" />;
}

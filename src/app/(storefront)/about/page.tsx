import { ContentPage } from "@/components/storefront/content-page";

export const metadata = { title: "About" };

// Dynamic so the per-request CSP nonce reaches this page's scripts, and so a
// publish from Studio is live without a deploy.
export const dynamic = "force-dynamic";

/**
 * About BAD ERA — content is managed in Studio (Site Editor -> about).
 *
 * Deliberately no fallback copy: see `ContentPage` for why placeholder legal
 * wording is worse than an honest "not published yet".
 */
export default function AboutPage() {
  return <ContentPage pageKey="about" title="About BAD ERA" />;
}

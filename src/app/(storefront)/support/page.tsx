import { RouteShell } from "@/components/ui/route-shell";

export const metadata = { title: "Support" };

// Dynamic so the per-request CSP nonce reaches this page's scripts.
export const dynamic = "force-dynamic";

export default function SupportPage() {
  return <RouteShell area="Storefront" title="Support" phase="Phase 7" />;
}

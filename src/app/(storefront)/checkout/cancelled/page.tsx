import { RouteShell } from "@/components/ui/route-shell";

export const metadata = { title: "Checkout cancelled", robots: { index: false } };

// Dynamic so the per-request CSP nonce reaches this page's scripts.
// A prerendered page cannot carry one, and would serve unhydrated.
export const dynamic = "force-dynamic";

export default function CheckoutCancelledPage() {
  return <RouteShell area="Checkout" title="Checkout cancelled" phase="Phase 1" />;
}

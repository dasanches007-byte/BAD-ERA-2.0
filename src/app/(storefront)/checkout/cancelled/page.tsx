import { RouteShell } from "@/components/ui/route-shell";

export const metadata = { title: "Checkout cancelled", robots: { index: false } };

export default function CheckoutCancelledPage() {
  return <RouteShell area="Checkout" title="Checkout cancelled" phase="Phase 1" />;
}

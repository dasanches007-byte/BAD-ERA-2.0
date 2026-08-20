import { RouteShell } from "@/components/ui/route-shell";

export const metadata = { title: "Order received", robots: { index: false } };

/**
 * The success page is NEVER payment truth and NEVER performs fulfillment
 * (Master Spec §6.3, Kickoff v0.2 §5). It reads server order state and shows a
 * "processing confirmation" state until the verified webhook lands.
 */
export default function CheckoutSuccessPage() {
  return <RouteShell area="Checkout" title="Order received" phase="Phase 1" />;
}

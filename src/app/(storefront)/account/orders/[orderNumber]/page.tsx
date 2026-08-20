import { RouteShell } from "@/components/ui/route-shell";

export const metadata = { title: "Order", robots: { index: false } };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return (
    <RouteShell area="Account" title="Order" phase="Phase 5">
      <p className="mt-2 text-sm text-ink-subtle">order: {orderNumber}</p>
    </RouteShell>
  );
}

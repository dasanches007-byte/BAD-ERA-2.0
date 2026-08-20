import { RouteShell } from "@/components/ui/route-shell";

export const metadata = { title: "Inventory & Fulfillment" };

export default async function Page({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const resolved = await params;
  return (
    <RouteShell area="Studio" title="Inventory & Fulfillment" phase="Phase 6">
      <p className="mt-2 text-sm text-ink-subtle">productId: {resolved.productId}</p>
    </RouteShell>
  );
}

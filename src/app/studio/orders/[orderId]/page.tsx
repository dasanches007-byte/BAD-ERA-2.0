import { RouteShell } from "@/components/ui/route-shell";

export const metadata = { title: "Order workspace" };

export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolved = await params;
  return (
    <RouteShell area="Studio" title="Order workspace" phase="Phase 5">
      <p className="mt-2 text-sm text-ink-subtle">orderId: {resolved.orderId}</p>
    </RouteShell>
  );
}

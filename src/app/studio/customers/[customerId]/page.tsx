import { RouteShell } from "@/components/ui/route-shell";

export const metadata = { title: "Customer" };

export default async function Page({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const resolved = await params;
  return (
    <RouteShell area="Studio" title="Customer" phase="Phase 5">
      <p className="mt-2 text-sm text-ink-subtle">customerId: {resolved.customerId}</p>
    </RouteShell>
  );
}

import { RouteShell } from "@/components/ui/route-shell";

export const metadata = { title: "Variants" };

export default async function Page({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const resolved = await params;
  return (
    <RouteShell area="Studio" title="Variants" phase="Phase 3">
      <p className="mt-2 text-sm text-ink-subtle">productId: {resolved.productId}</p>
    </RouteShell>
  );
}

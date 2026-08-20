import { RouteShell } from "@/components/ui/route-shell";

/**
 * Product detail. Every product renders from the ONE shared Editorial Commerce
 * template driven by structured data — never a bespoke page per product
 * (Master Spec §10.3.2).
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return (
    <RouteShell area="Storefront" title="Product" phase="Phase 2">
      <p className="mt-2 text-sm text-ink-subtle">handle: {handle}</p>
    </RouteShell>
  );
}

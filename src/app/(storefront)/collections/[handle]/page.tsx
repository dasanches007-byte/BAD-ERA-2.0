import { RouteShell } from "@/components/ui/route-shell";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return (
    <RouteShell area="Storefront" title="Collection" phase="Phase 2">
      <p className="mt-2 text-sm text-ink-subtle">handle: {handle}</p>
    </RouteShell>
  );
}

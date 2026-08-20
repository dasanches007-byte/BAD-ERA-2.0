import { RouteShell } from "@/components/ui/route-shell";

export const metadata = { title: "Provider details" };

export default async function Page({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const resolved = await params;
  return (
    <RouteShell area="Studio" title="Provider details" phase="Phase 6">
      <p className="mt-2 text-sm text-ink-subtle">providerId: {resolved.providerId}</p>
    </RouteShell>
  );
}

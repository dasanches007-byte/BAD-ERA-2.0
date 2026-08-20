import { RouteShell } from "@/components/ui/route-shell";

export const metadata = { title: "Page editor" };

export default async function Page({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const resolved = await params;
  return (
    <RouteShell area="Studio" title="Page editor" phase="Phase 4">
      <p className="mt-2 text-sm text-ink-subtle">page: {resolved.page}</p>
    </RouteShell>
  );
}

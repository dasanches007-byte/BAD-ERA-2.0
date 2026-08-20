import { RouteShell } from "@/components/ui/route-shell";

export const metadata = { title: "Account", robots: { index: false } };

export default function AccountPage() {
  return <RouteShell area="Account" title="Account" phase="Phase 5" />;
}

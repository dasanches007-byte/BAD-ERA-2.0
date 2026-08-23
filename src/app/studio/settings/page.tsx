import { PageHeader, Panel } from "@/components/studio/primitives";
import { MfaSettingsPanel } from "@/components/studio/mfa-panel";
import { getMfaStatus } from "@/lib/auth/mfa";

export const metadata = { title: "Settings" };

/**
 * Studio settings.
 *
 * Phase 9 ships the security section. Store settings (flat shipping, return
 * window, stock thresholds) are read through `site_settings` by the domain
 * layer and get their editors alongside the rest of the settings surface —
 * shipping an empty shell for them here would suggest they are configurable
 * when they are not.
 */
export default async function StudioSettingsPage() {
  const mfa = await getMfaStatus();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Studio"
        title="Settings"
        description="Account security for the Studio owner."
      />

      <Panel title="Security">
        <MfaSettingsPanel status={mfa} />
      </Panel>
    </div>
  );
}

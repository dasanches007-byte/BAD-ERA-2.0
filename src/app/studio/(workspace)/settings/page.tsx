import { LoadError, PageHeader, Panel } from "@/components/studio/primitives";
import { MfaSettingsPanel } from "@/components/studio/mfa-panel";
import { OrderEmailForm } from "@/components/studio/order-email-form";
import { ShippingSettingsForm } from "@/components/studio/shipping-settings-form";
import { getMfaStatus } from "@/lib/auth/mfa";
import type { OrderEmailWords } from "@/lib/email/order-confirmation";
import { emailConfigured } from "@/lib/email/resend";
import { readOrderEmailWords, readShippingRule } from "@/lib/settings/store";
import type { ShippingRule } from "@/lib/settings/shipping";

export const metadata = { title: "Settings" };

/**
 * Studio settings: the store's own values (shipping, the order email), then
 * account security.
 *
 * A failed read renders as a failure, never as an empty form: an owner who
 * saw a blank shipping field over a broken query might "set" a value that
 * was already there.
 */
export default async function StudioSettingsPage() {
  const [mfa, shipping, emailWords] = await Promise.all([
    getMfaStatus(),
    readShippingRule().then(
      (rule): { ok: true; rule: ShippingRule | null } => ({ ok: true, rule }),
      (error: unknown) => {
        console.error("[bad-era] studio settings: shipping read failed", error);
        return { ok: false } as const;
      },
    ),
    readOrderEmailWords().then(
      (words): { ok: true; words: OrderEmailWords } => ({ ok: true, words }),
      (error: unknown) => {
        console.error("[bad-era] studio settings: order email read failed", error);
        return { ok: false } as const;
      },
    ),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Studio"
        title="Settings"
        description="What the store charges for shipping, the email customers get when they order, and the security of your Studio account."
      />

      <Panel title="Shipping">
        {shipping.ok ? (
          <ShippingSettingsForm rule={shipping.rule} />
        ) : (
          <LoadError what="the shipping setting" />
        )}
      </Panel>

      <Panel title="Order email">
        {emailWords.ok ? (
          <OrderEmailForm words={emailWords.words} emailReady={emailConfigured()} />
        ) : (
          <LoadError what="the order email" />
        )}
      </Panel>

      <Panel title="Security">
        <MfaSettingsPanel status={mfa} />
      </Panel>
    </div>
  );
}

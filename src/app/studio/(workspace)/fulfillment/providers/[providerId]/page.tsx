import { notFound } from "next/navigation";

import {
  PageHeader,
  Panel,
  StatusChip,
  formatDateTime,
} from "@/components/studio/primitives";
import { getProvider } from "@/lib/fulfillment/queries";
import { LIFECYCLE_LABEL, providerBadge } from "@/lib/fulfillment/types";

export const metadata = { title: "Provider" };

/**
 * Provider details (Master Spec §10.4.6).
 *
 * Performance metrics are deliberately absent until there is enough completed
 * provider data to compute them truthfully. Showing a fabricated success rate
 * would be worse than showing nothing (Master Spec §10.4.7).
 */
export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const provider = await getProvider(providerId);
  if (!provider) notFound();

  const badge = providerBadge(provider);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Provider"
        title={provider.name}
        description={LIFECYCLE_LABEL[provider.lifecycleStatus]}
        actions={
          <StatusChip
            tone={
              badge === "ACTION REQUIRED"
                ? "critical"
                : badge === "DEGRADED" || badge === "DRAFT"
                  ? "warning"
                  : badge === "CONNECTED"
                    ? "success"
                    : "neutral"
            }
          >
            {badge}
          </StatusChip>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Overview">
          <dl className="space-y-3 px-6 py-5 text-sm">
            <Row label="Connection" value={provider.connectionMode} />
            <Row label="Type" value={provider.providerType} />
            <Row label="Mapped products" value={String(provider.mappedProductCount)} />
            <Row label="Mapped variants" value={String(provider.mappedVariantCount)} />
            <Row label="Open fulfillments" value={String(provider.openFulfillments)} />
            <Row
              label="Needs action"
              value={String(provider.actionRequiredCount)}
            />
            {provider.connectionMode === "api" ? (
              <Row
                label="Last sync"
                value={
                  provider.lastSyncedAt
                    ? formatDateTime(provider.lastSyncedAt)
                    : "Never"
                }
              />
            ) : null}
          </dl>
        </Panel>

        <Panel title="Performance">
          <div className="px-6 py-8 text-center">
            <p className="label text-ink-subtle">Not enough data</p>
            <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-ink-muted">
              Success rate and fulfillment time are computed from completed
              provider records. They stay hidden until there are enough to be
              meaningful, rather than showing a number that is not real.
            </p>
          </div>
        </Panel>

        {provider.orderingUrl ? (
          <Panel title="Ordering">
            <div className="px-6 py-5">
              <p className="text-xs text-ink-subtle">Portal</p>
              <a
                href={provider.orderingUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 block text-sm break-all text-ink transition-colors hover:text-accent-strong"
              >
                {provider.orderingUrl}
              </a>
              <p className="mt-4 text-xs leading-relaxed text-ink-muted">
                Opening this changes no fulfillment state.
              </p>
            </div>
          </Panel>
        ) : null}

        <Panel title="Connection">
          <div className="px-6 py-5 text-sm leading-relaxed text-ink-muted">
            {provider.connectionMode === "internal" ? (
              <p>Internal BAD ERA stock. No external connection exists.</p>
            ) : provider.connectionMode === "manual" ? (
              <p>
                Manual supplier. Orders are placed by you outside Studio; there
                is no API to sync with, and no credentials are stored.
              </p>
            ) : (
              <p>
                API provider. Credentials are held server-side by reference and
                are never sent to the browser.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

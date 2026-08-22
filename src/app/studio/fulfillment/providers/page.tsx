import Link from "next/link";

import { FulfillmentTabs } from "@/components/studio/fulfillment-tabs";
import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
  StatusChip,
  formatDateTime,
} from "@/components/studio/primitives";
import { getFulfillmentCounts, listProviders } from "@/lib/fulfillment/queries";
import { LIFECYCLE_LABEL, providerBadge } from "@/lib/fulfillment/types";
import type { ProviderBadge, ProviderCard } from "@/lib/fulfillment/types";

export const metadata = { title: "Providers" };

const BADGE_TONE: Record<ProviderBadge, "success" | "warning" | "critical" | "neutral" | "info"> = {
  CONNECTED: "success",
  MANUAL: "info",
  INTERNAL: "neutral",
  DEGRADED: "warning",
  "ACTION REQUIRED": "critical",
  DISABLED: "neutral",
  DRAFT: "warning",
};

export default async function ProvidersPage() {
  let providers: ProviderCard[], counts;
  try {
    [providers, counts] = await Promise.all([
      listProviders(),
      getFulfillmentCounts(),
    ]);
  } catch (error) {
    console.error("[bad-era] providers read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Fulfillment" title="Providers" />
        <Panel>
          <LoadError what="providers" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fulfillment"
        title="Providers"
        description="Who actually fulfils each product. BAD ERA STOCK is internal; manual suppliers are a first-class type, not a workaround."
      />
      <FulfillmentTabs counts={counts} />

      {providers.length === 0 ? (
        <Panel>
          <EmptyState
            title="No providers yet"
            body="BAD ERA STOCK is the native internal provider. Add a manual supplier when you start sourcing externally."
          />
        </Panel>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider) => {
            const badge = providerBadge(provider);
            return (
              <li key={provider.id} className="hairline flex flex-col bg-surface-raised">
                <header className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm text-ink">{provider.name}</h2>
                    <p className="mt-1 text-xs text-ink-subtle">
                      {LIFECYCLE_LABEL[provider.lifecycleStatus]}
                    </p>
                  </div>
                  <StatusChip tone={BADGE_TONE[badge]}>{badge}</StatusChip>
                </header>

                <dl className="flex-1 space-y-3 px-6 py-5 text-sm">
                  <Row label="Products" value={String(provider.mappedProductCount)} />
                  <Row label="Variants" value={String(provider.mappedVariantCount)} />
                  <Row label="Open fulfillments" value={String(provider.openFulfillments)} />
                  {provider.actionRequiredCount > 0 ? (
                    <div className="flex justify-between">
                      <dt className="text-ink-muted">Needs action</dt>
                      <dd className="text-state-critical">
                        {provider.actionRequiredCount}
                      </dd>
                    </div>
                  ) : null}
                  {/* Manual and internal providers show no sync line at all —
                      a timestamp there would be fiction (Master Spec §10.4.3). */}
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

                <footer className="border-t border-line px-6 py-4">
                  <Link
                    href={`/studio/fulfillment/providers/${provider.id}`}
                    className="label text-ink-muted transition-colors hover:text-ink"
                  >
                    View details &rarr;
                  </Link>
                </footer>
              </li>
            );
          })}
        </ul>
      )}
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

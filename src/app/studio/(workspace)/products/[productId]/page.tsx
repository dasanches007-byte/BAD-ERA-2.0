import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/studio/product-form";
import { ProductTabs } from "@/components/studio/product-tabs";
import {
  PageHeader,
  Panel,
  StatusChip,
  formatMoney,
} from "@/components/studio/primitives";
import {
  INVENTORY_MODE_LABEL,
  getStudioProduct,
} from "@/lib/studio/products";
import type { StudioProduct, StudioVariant } from "@/lib/studio/products";

export const metadata = { title: "Product" };

/**
 * Product editor — General (Master Spec §10.3.2).
 *
 * Product Editor tabs: General, Media, Variants, Inventory & Fulfillment,
 * Pricing. Inventory & Fulfillment is its own workspace, never a hidden
 * accordion inside General (Master Spec §10.4.9).
 *
 * This phase delivers the read surfaces and the inventory adjustment mutation.
 * Field-level product editing forms follow with the Media Library, so the
 * screens do not ship half-wired inputs that silently discard edits.
 */
export default async function StudioProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getStudioProduct(productId);
  if (!product) notFound();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Product"
        title={product.title}
        description={product.subtitle ?? undefined}
        actions={
          <>
            <StatusChip tone={product.status === "active" ? "success" : "warning"}>
              {product.status}
            </StatusChip>
            <Link
              href={`/products/${product.handle}`}
              target="_blank"
              rel="noreferrer"
              className="label border border-line-strong px-4 py-2 text-ink-muted transition-colors hover:border-ink hover:text-ink"
            >
              View
            </Link>
          </>
        }
      />

      <ProductTabs productId={product.id} active="general" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <ProductForm product={product} />
        </div>

        <VariantRail product={product} />
      </div>
    </div>
  );
}

/**
 * Variant rail (Master Spec §10.4.12).
 *
 * For STOCKED products this shows variant plus available quantity. A bundle
 * never shows its own quantity — its availability is derived from components,
 * and it must never hold a stock count of its own (Master Spec §14.3.5).
 */
function VariantRail({ product }: { product: StudioProduct }) {
  const isBundle = product.kind === "bundle";

  return (
    <Panel
      title={isBundle ? "Components" : "Variants"}
      action={
        <Link
          href={`/studio/products/${product.id}/variants`}
          className="label text-ink-muted hover:text-ink"
        >
          Manage
        </Link>
      }
      className="xl:sticky xl:top-6 xl:self-start"
    >
      {isBundle ? (
        <p className="border-b border-line px-6 py-4 text-xs leading-relaxed text-ink-muted">
          This is a virtual composite. Availability is derived from its component
          variants and it never holds its own stock count.
        </p>
      ) : null}

      {product.variants.length === 0 ? (
        <p className="px-6 py-8 text-sm text-ink-muted">No variants yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {product.variants.map((variant) => (
            <VariantRow key={variant.id} variant={variant} isBundle={isBundle} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function VariantRow({
  variant,
  isBundle,
}: {
  variant: StudioVariant;
  isBundle: boolean;
}) {
  const optionSummary = Object.entries(variant.options)
    .map(([name, value]) => `${name}: ${value}`)
    .join(" · ");

  return (
    <li className="px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink">{variant.title}</p>
          <p className="mt-1 truncate text-xs text-ink-subtle">
            {optionSummary || variant.sku || "—"}
          </p>
        </div>
        <span className="shrink-0 text-sm text-ink">
          {formatMoney(variant.priceCents, variant.currency)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusChip tone="neutral">
          {INVENTORY_MODE_LABEL[variant.inventoryMode]}
        </StatusChip>

        {/* Quantity is only meaningful for tracked, non-bundle variants. */}
        {!isBundle && variant.available !== null ? (
          <StatusChip
            tone={
              variant.available <= 0
                ? "critical"
                : variant.available <= variant.lowStockThreshold
                  ? "warning"
                  : "success"
            }
          >
            {variant.available <= 0 ? "Sold out" : `${variant.available} available`}
          </StatusChip>
        ) : null}

        {!variant.active ? <StatusChip tone="neutral">Inactive</StatusChip> : null}
      </div>
    </li>
  );
}

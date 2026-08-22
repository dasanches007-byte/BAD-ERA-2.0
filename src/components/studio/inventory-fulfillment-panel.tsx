"use client";

import { useState, useTransition } from "react";

import { StatusChip } from "@/components/studio/primitives";
import {
  saveVariantMappingAction,
  setAutoSubmitAction,
  setInventoryModeAction,
} from "@/lib/fulfillment/actions";
import {
  INVENTORY_MODES,
  fieldsForMode,
} from "@/lib/fulfillment/product-fulfillment-types";
import type {
  ProductFulfillment,
  VariantFulfillment,
} from "@/lib/fulfillment/product-fulfillment-types";

/**
 * Inventory & Fulfillment workspace (Master Spec §10.4.8–§10.4.13).
 *
 * The owner-facing label is primary; the technical enum appears only as small
 * supporting metadata. Fields adapt to the chosen mode rather than showing
 * irrelevant ones — a supplier-stocked variant has no local quantity, and a
 * manual supplier has no sync controls to fake.
 *
 * The five mode choices stack on small screens. Squeezing them into an
 * unreadable row is explicitly called out as wrong (Master Spec §10.4.18).
 */
export function InventoryFulfillmentPanel({
  product,
}: {
  product: ProductFulfillment;
}) {
  return (
    <div className="space-y-4">
      {product.isBundle ? (
        <p className="hairline bg-surface-raised px-6 py-4 text-xs leading-relaxed text-ink-muted">
          This is a virtual composite. Fulfillment follows its component
          variants; the bundle itself is never stocked or submitted.
        </p>
      ) : null}

      {product.variants.length === 0 ? (
        <div className="hairline bg-surface-raised px-6 py-12 text-center">
          <p className="label text-ink-subtle">No active variants</p>
        </div>
      ) : (
        product.variants.map((variant) => (
          <VariantFulfillmentCard
            key={variant.id}
            productId={product.productId}
            variant={variant}
            providers={product.providers}
          />
        ))
      )}
    </div>
  );
}

function VariantFulfillmentCard({
  productId,
  variant,
  providers,
}: {
  productId: string;
  variant: VariantFulfillment;
  providers: ProductFulfillment["providers"];
}) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState(variant.inventoryMode);
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  const fields = fieldsForMode(mode);

  function changeMode(next: typeof mode) {
    const previous = mode;
    setMode(next);
    setMessage(null);
    startTransition(async () => {
      const result = await setInventoryModeAction({
        variantId: variant.id,
        productId,
        inventoryMode: next,
      });
      if (result.ok) {
        setMessage({
          tone: "ok",
          text:
            next === "stocked"
              ? "Now tracked locally."
              : "Local quantity tracking turned off for this mode.",
        });
      } else {
        setMode(previous);
        setMessage({ tone: "error", text: result.message });
      }
    });
  }

  return (
    <section className="hairline bg-surface-raised">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm text-ink">{variant.title}</h3>
          {variant.sku ? (
            <p className="mt-1 text-xs text-ink-subtle">{variant.sku}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {variant.needsMapping ? (
            <StatusChip tone="critical">Needs mapping</StatusChip>
          ) : null}
          {variant.available !== null ? (
            <StatusChip
              tone={
                variant.available <= 0
                  ? "critical"
                  : variant.available <= variant.lowStockThreshold
                    ? "warning"
                    : "success"
              }
            >
              {variant.available <= 0
                ? "Sold out"
                : `${variant.available} available`}
            </StatusChip>
          ) : null}
        </div>
      </header>

      <div className="px-6 py-6">
        <p className="label text-ink-subtle">How is this fulfilled?</p>
        {/* Stacked on mobile, two up on tablet, never a five-across strip. */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {INVENTORY_MODES.map((option) => {
            const selected = option.value === mode;
            return (
              <button
                key={option.value}
                type="button"
                disabled={pending}
                onClick={() => changeMode(option.value)}
                aria-pressed={selected}
                className={`border p-4 text-left transition-colors disabled:cursor-not-allowed ${
                  selected
                    ? "border-ink bg-surface-overlay"
                    : "border-line-strong hover:border-ink"
                }`}
              >
                <span className="block text-sm text-ink">{option.label}</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-ink-subtle">
                  {option.description}
                </span>
                {/* The enum stays small supporting metadata. */}
                <span className="label mt-3 block text-ink-disabled">
                  {option.value}
                </span>
              </button>
            );
          })}
        </div>

        {fields.quantity ? (
          <div className="mt-7 border-t border-line pt-6">
            <p className="label text-ink-subtle">Stock</p>
            <p className="mt-3 text-sm text-ink-muted">
              {variant.locationName ?? "BAD ERA STOCK"} ·{" "}
              {variant.available ?? 0} available
            </p>
            <p className="mt-2 text-xs text-ink-subtle">
              Quantity is changed in Inventory, where every change is audited.
            </p>
          </div>
        ) : null}

        {fields.provider ? (
          <MappingForm
            productId={productId}
            variant={variant}
            providers={providers}
            showStockBuffer={fields.stockBuffer}
            showAutoSubmit={fields.autoSubmit}
          />
        ) : null}

        {mode === "untracked" ? (
          <p className="mt-7 border-t border-line pt-6 text-xs leading-relaxed text-ink-muted">
            Quantity controls are hidden because this item does not track one.
          </p>
        ) : null}

        {message ? (
          <p
            aria-live="polite"
            className={`label mt-6 ${
              message.tone === "ok" ? "text-state-success" : "text-state-critical"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function MappingForm({
  productId,
  variant,
  providers,
  showStockBuffer,
  showAutoSubmit,
}: {
  productId: string;
  variant: VariantFulfillment;
  providers: ProductFulfillment["providers"];
  showStockBuffer: boolean;
  showAutoSubmit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);
  const [autoSubmit, setAutoSubmit] = useState(variant.mapping?.autoSubmit ?? false);

  return (
    <div className="mt-7 border-t border-line pt-6">
      <p className="label text-ink-subtle">Supplier mapping</p>

      <form
        action={(formData) => {
          setMessage(null);
          const cost = String(formData.get("supplierCost") ?? "").trim();
          startTransition(async () => {
            const result = await saveVariantMappingAction({
              variantId: variant.id,
              productId,
              providerId: String(formData.get("providerId") ?? ""),
              supplierSku: String(formData.get("supplierSku") ?? "") || null,
              supplierCostCents: cost ? Math.round(Number(cost) * 100) : null,
              stockBuffer: Number(formData.get("stockBuffer") ?? 0),
            });
            setMessage(
              result.ok
                ? { tone: "ok", text: "Mapping saved." }
                : { tone: "error", text: result.message },
            );
          });
        }}
        className="mt-4 grid gap-4 sm:grid-cols-2"
      >
        <div>
          <label className="label block text-ink-subtle">Provider</label>
          <select
            name="providerId"
            defaultValue={variant.mapping?.providerId ?? ""}
            required
            className="mt-2 w-full border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            <option value="" disabled>
              Choose a provider
            </option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label block text-ink-subtle">Supplier SKU</label>
          <input
            name="supplierSku"
            defaultValue={variant.mapping?.supplierSku ?? ""}
            className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label className="label block text-ink-subtle">
            Supplier cost (Studio only)
          </label>
          <input
            name="supplierCost"
            inputMode="decimal"
            defaultValue={
              variant.mapping?.supplierCostCents !== null &&
              variant.mapping?.supplierCostCents !== undefined
                ? (variant.mapping.supplierCostCents / 100).toFixed(2)
                : ""
            }
            className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-ink-subtle">
            Never shown to customers.
          </p>
        </div>

        {showStockBuffer ? (
          <div>
            <label className="label block text-ink-subtle">Stock buffer</label>
            <input
              name="stockBuffer"
              inputMode="numeric"
              defaultValue={String(variant.mapping?.stockBuffer ?? 0)}
              className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-ink-subtle">
              Held back from supplier-reported stock.
            </p>
          </div>
        ) : (
          <input type="hidden" name="stockBuffer" value={variant.mapping?.stockBuffer ?? 0} />
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="label border border-ink/70 px-6 py-2.5 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
          >
            {pending ? "Saving…" : "Save mapping"}
          </button>
        </div>
      </form>

      {showAutoSubmit && variant.mapping ? (
        <div className="mt-6 border-t border-line pt-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={autoSubmit}
              disabled={pending}
              onChange={(e) => {
                const next = e.target.checked;
                setMessage(null);
                startTransition(async () => {
                  const result = await setAutoSubmitAction({
                    mappingId: variant.mapping!.id,
                    productId,
                    enabled: next,
                  });
                  if (result.ok) setAutoSubmit(next);
                  else setMessage({ tone: "error", text: result.message });
                });
              }}
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-sm text-ink">
                Submit orders to this provider automatically
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-subtle">
                Off by default. Requires the provider to be live automated and
                every sellable variant mapped. Submission only ever happens
                after verified payment — never from the success page.
              </span>
            </span>
          </label>
        </div>
      ) : null}

      {message ? (
        <p
          aria-live="polite"
          className={`label mt-5 ${
            message.tone === "ok" ? "text-state-success" : "text-state-critical"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

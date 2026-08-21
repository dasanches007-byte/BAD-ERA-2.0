"use client";

import { useState, useTransition } from "react";

import { StatusChip } from "@/components/studio/primitives";
import { updateVariantAction } from "@/lib/studio/product-actions";
import { INVENTORY_MODE_LABEL } from "@/lib/studio/product-types";
import type { StudioVariant } from "@/lib/studio/product-types";

/**
 * Variant editor (Master Spec §10.3.3).
 *
 * Editable: title, SKU, price, low-stock threshold, continue-selling policy,
 * tracking, active state. NOT editable here: quantity — that belongs to the
 * Inventory module, where every change is an audited movement rather than a
 * silent field write (Master Spec §10.3.4, §14.2).
 *
 * Changing a display label never changes the stable variant id, so existing
 * order history and provider mappings survive a rename.
 */
export function VariantEditor({
  productId,
  variants,
  isBundle,
}: {
  productId: string;
  variants: StudioVariant[];
  isBundle: boolean;
}) {
  if (variants.length === 0) {
    return (
      <div className="hairline bg-surface-raised px-6 py-12 text-center">
        <p className="label text-ink-subtle">No variants yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isBundle ? (
        <p className="hairline bg-surface-raised px-6 py-4 text-xs leading-relaxed text-ink-muted">
          This product is a virtual composite. Its availability is derived from
          its component variants and it must never hold its own stock count.
        </p>
      ) : null}
      {variants.map((variant) => (
        <VariantCard key={variant.id} productId={productId} variant={variant} />
      ))}
    </div>
  );
}

function VariantCard({
  productId,
  variant,
}: {
  productId: string;
  variant: StudioVariant;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  const [form, setForm] = useState({
    title: variant.title,
    sku: variant.sku ?? "",
    // Edited in dollars; stored as integer cents.
    price: (variant.priceCents / 100).toFixed(2),
    lowStockThreshold: String(variant.lowStockThreshold),
    continueSelling: variant.continueSellingWhenOutOfStock,
    trackInventory: variant.trackInventory,
    active: variant.active,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage(null);
  }

  function save() {
    const dollars = Number(form.price);
    if (!Number.isFinite(dollars) || dollars < 0) {
      setMessage({ tone: "error", text: "Enter a valid price." });
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await updateVariantAction({
        variantId: variant.id,
        productId,
        title: form.title,
        sku: form.sku || null,
        // Round to the nearest cent rather than truncating a float.
        priceCents: Math.round(dollars * 100),
        lowStockThreshold: Number(form.lowStockThreshold) || 0,
        continueSellingWhenOutOfStock: form.continueSelling,
        trackInventory: form.trackInventory,
        active: form.active,
      });
      setMessage(
        result.ok
          ? { tone: "ok", text: "Saved." }
          : { tone: "error", text: result.message },
      );
    });
  }

  const optionSummary = Object.entries(variant.options)
    .map(([name, value]) => `${name}: ${value}`)
    .join(" · ");

  return (
    <section className="hairline bg-surface-raised">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm text-ink">{variant.title}</h3>
          {optionSummary ? (
            <p className="mt-1 truncate text-xs text-ink-subtle">{optionSummary}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone="neutral">
            {INVENTORY_MODE_LABEL[variant.inventoryMode]}
          </StatusChip>
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

      <div className="grid gap-5 px-6 py-6 lg:grid-cols-3">
        <TextField
          id={`title-${variant.id}`}
          label="Title"
          value={form.title}
          onChange={(v) => set("title", v)}
        />
        <TextField
          id={`sku-${variant.id}`}
          label="SKU"
          value={form.sku}
          onChange={(v) => set("sku", v)}
        />
        <TextField
          id={`price-${variant.id}`}
          label="Price (USD)"
          value={form.price}
          onChange={(v) => set("price", v)}
          inputMode="decimal"
        />
        <TextField
          id={`threshold-${variant.id}`}
          label="Low stock threshold"
          value={form.lowStockThreshold}
          onChange={(v) => set("lowStockThreshold", v)}
          inputMode="numeric"
        />

        <div className="space-y-3 lg:col-span-2">
          <Toggle
            id={`track-${variant.id}`}
            label="Track quantity"
            checked={form.trackInventory}
            onChange={(v) => set("trackInventory", v)}
          />
          <Toggle
            id={`continue-${variant.id}`}
            label="Continue selling when out of stock"
            checked={form.continueSelling}
            onChange={(v) => set("continueSelling", v)}
            hint="Off for Archive 01 — those pieces are never restocked."
          />
          <Toggle
            id={`active-${variant.id}`}
            label="Active"
            checked={form.active}
            onChange={(v) => set("active", v)}
            hint="Inactive variants stay in order history but leave the storefront."
          />
        </div>
      </div>

      <footer className="flex items-center gap-5 border-t border-line px-6 py-4">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="label border border-ink/70 px-6 py-2.5 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
        >
          {pending ? "Saving…" : "Save variant"}
        </button>
        <span className="text-xs text-ink-subtle">
          Quantity is changed in Inventory, where every change is audited.
        </span>
        {message ? (
          <span
            aria-live="polite"
            className={`label ml-auto ${
              message.tone === "ok" ? "text-state-success" : "text-state-critical"
            }`}
          >
            {message.text}
          </span>
        ) : null}
      </footer>
    </section>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <div>
      <label htmlFor={id} className="label block text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
      />
    </div>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 accent-[var(--color-accent)]"
        />
        <span className="text-sm text-ink">{label}</span>
      </label>
      {hint ? <p className="mt-1 ml-7 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

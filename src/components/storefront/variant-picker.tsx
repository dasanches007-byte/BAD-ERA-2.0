"use client";

import { useMemo, useState, useTransition } from "react";

import { addToCartAction } from "@/lib/cart/actions";
import { formatPrice } from "@/components/storefront/product-card";
import { STOCK_STATE_LABEL } from "@/lib/inventory/availability";
import type { CatalogProduct, CatalogVariant } from "@/lib/catalog/queries";

/**
 * Variant selection and add-to-cart.
 *
 * A Client Component because it is genuinely interactive; everything around it
 * on the PDP stays a Server Component (Master Spec §16.1).
 *
 * A sold-out variant is DISABLED BUT STILL LEGIBLE (Master Spec §5.1) — never
 * hidden, so the customer can see the size existed and simply is not available.
 *
 * Availability shown here is server-derived. It is display truth, not the
 * oversell guarantee: that is enforced atomically at reservation time.
 */
export function VariantPicker({ product }: { product: CatalogProduct }) {
  const optionNames = useMemo(() => {
    const names: string[] = [];
    for (const variant of product.variants) {
      for (const name of Object.keys(variant.options)) {
        if (!names.includes(name)) names.push(name);
      }
    }
    return names;
  }, [product.variants]);

  const firstAvailable =
    product.variants.find((v) => v.purchasable) ?? product.variants[0];

  const [selectedId, setSelectedId] = useState<string | undefined>(
    firstAvailable?.id,
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const selected = product.variants.find((v) => v.id === selectedId);

  function handleAdd() {
    if (!selected) return;
    setMessage(null);
    setAdded(false);
    startTransition(async () => {
      const result = await addToCartAction(selected.id, 1);
      if (result.ok) {
        setAdded(true);
      } else {
        // Surface the server's reason rather than a generic failure: "sold out"
        // and "quantity limit" need different customer responses.
        setMessage(result.message);
      }
    });
  }

  if (product.variants.length === 0) {
    return (
      <p className="label text-state-critical">Unavailable</p>
    );
  }

  // Single-variant products need no picker, just a price and a button.
  const showPicker = product.variants.length > 1;

  return (
    <div>
      <p className="text-xl text-ink">
        {selected ? formatPrice(selected.priceCents, selected.currency) : null}
      </p>

      {showPicker
        ? optionNames.map((optionName) => (
            <OptionRow
              key={optionName}
              optionName={optionName}
              variants={product.variants}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))
        : null}

      {selected ? (
        <p
          className={`label mt-8 ${
            selected.purchasable ? "text-ink-subtle" : "text-state-critical"
          }`}
        >
          {STOCK_STATE_LABEL[selected.stockState]}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleAdd}
        disabled={!selected?.purchasable || pending}
        className="label mt-6 w-full border border-ink/70 px-8 py-5 text-ink transition-colors duration-[var(--animate-duration-base)] hover:border-ink hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-ink-disabled disabled:hover:bg-transparent"
      >
        {!selected?.purchasable
          ? "Sold out"
          : pending
            ? "Adding…"
            : added
              ? "Added to cart"
              : "Add to cart"}
      </button>

      <p aria-live="polite" className="min-h-5">
        {message ? (
          <span className="label mt-4 inline-block text-state-critical">
            {message}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function OptionRow({
  optionName,
  variants,
  selectedId,
  onSelect,
}: {
  optionName: string;
  variants: CatalogVariant[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  // Distinct values for this option, in variant order.
  const values: { value: string; variant: CatalogVariant }[] = [];
  for (const variant of variants) {
    const value = variant.options[optionName];
    if (!value) continue;
    if (values.some((v) => v.value === value)) continue;
    values.push({ value, variant });
  }

  if (values.length === 0) return null;

  return (
    <fieldset className="mt-8">
      <legend className="label text-ink-subtle">{optionName}</legend>
      <div className="mt-4 flex flex-wrap gap-3">
        {values.map(({ value, variant }) => {
          const isSelected = variant.id === selectedId;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(variant.id)}
              disabled={!variant.purchasable}
              aria-pressed={isSelected}
              className={[
                "label min-w-14 border px-5 py-3 transition-colors duration-[var(--animate-duration-fast)]",
                isSelected
                  ? "border-ink bg-ink text-inverse-ink"
                  : "border-line-strong text-ink hover:border-ink",
                // Sold out stays readable: dimmed and struck, never removed.
                !variant.purchasable
                  ? "cursor-not-allowed border-line text-ink-disabled line-through hover:border-line"
                  : "",
              ].join(" ")}
            >
              {value}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

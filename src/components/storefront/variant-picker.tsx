"use client";

import { useState, useTransition } from "react";

import { addToCartAction } from "@/lib/cart/actions";
import { formatPrice } from "@/components/storefront/product-card";
import { STOCK_STATE_LABEL } from "@/lib/inventory/availability";
import type { CatalogProduct, CatalogVariant } from "@/lib/catalog/queries";
import { chooseValue, optionNamesOf, valueStates } from "@/lib/catalog/variant-choice";

/**
 * Variant selection and add-to-cart.
 *
 * Controlled by the product page, which also moves the gallery to the photos
 * of the chosen variant. Each option row changes that option and keeps the
 * others (`lib/catalog/variant-choice.ts`), so every combination of a
 * two-option product — Tee Size × Bag Color — can be reached.
 *
 * A sold-out value is DISABLED BUT STILL LEGIBLE (Master Spec §5.1) — never
 * hidden, so the customer can see it existed. A value that is only sold out
 * in combination with the current choice stays tappable and moves the other
 * choice to one that can be bought.
 *
 * Availability shown here is server-derived. It is display truth, not the
 * oversell guarantee: that is enforced atomically at reservation time.
 */
export function VariantPicker({
  product,
  selected,
  onSelect,
}: {
  product: CatalogProduct;
  selected: CatalogVariant | undefined;
  onSelect: (variant: CatalogVariant) => void;
}) {
  const optionNames = optionNamesOf(product.variants);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  function select(variant: CatalogVariant | undefined) {
    if (!variant) return;
    setAdded(false);
    setMessage(null);
    onSelect(variant);
  }

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
    return <p className="label text-state-critical">Unavailable</p>;
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
            <fieldset key={optionName} className="mt-8">
              <legend className="label text-ink-subtle">
                {optionName}
                {selected?.options[optionName] ? (
                  <span className="ml-3 text-ink">{selected.options[optionName]}</span>
                ) : null}
              </legend>
              <div className="mt-4 flex flex-wrap gap-3">
                {valueStates(product.variants, selected, optionName).map((state) => (
                  <button
                    key={state.value}
                    type="button"
                    onClick={() => select(chooseValue(product.variants, selected, optionName, state.value))}
                    disabled={!state.available}
                    aria-pressed={state.selected}
                    aria-label={
                      state.available
                        ? state.value
                        : `${state.value}, sold out`
                    }
                    className={[
                      "label min-h-11 min-w-14 border px-5 py-3 transition-colors duration-[var(--animate-duration-fast)]",
                      state.selected
                        ? "border-ink bg-ink text-inverse-ink"
                        : state.availableWithCurrent
                          ? "border-line-strong text-ink hover:border-ink"
                          : "border-line-strong text-ink-muted hover:border-ink",
                      // Sold out everywhere stays readable: dimmed and struck, never removed.
                      !state.available
                        ? "cursor-not-allowed border-line text-ink-disabled line-through hover:border-line"
                        : "",
                    ].join(" ")}
                  >
                    {state.value}
                  </button>
                ))}
              </div>
            </fieldset>
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

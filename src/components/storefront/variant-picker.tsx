"use client";

import type { Ref } from "react";

import { AddToBag } from "@/components/storefront/add-to-bag";
import { STOCK_STATE_LABEL } from "@/lib/inventory/availability";
import type { CatalogProduct, CatalogVariant } from "@/lib/catalog/queries";
import { chooseValue, optionNamesOf, valueStates } from "@/lib/catalog/variant-choice";

/**
 * Variant selection and the buy button, on pale cement.
 *
 * Controlled by the product page, which also moves the photos to the chosen
 * variant's. Each option row changes that option and keeps the others
 * (`lib/catalog/variant-choice.ts`), so every combination of a two-option
 * product — Tee Size × Bag Color — can be reached.
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
  addButtonRef,
}: {
  product: CatalogProduct;
  selected: CatalogVariant | undefined;
  onSelect: (variant: CatalogVariant) => void;
  /** The page's own buy button, so the phone's buy bar knows when it is in view. */
  addButtonRef?: Ref<HTMLButtonElement>;
}) {
  const optionNames = optionNamesOf(product.variants);

  if (product.variants.length === 0) {
    return <p className="text-xs font-bold uppercase tracking-[0.14em]">Unavailable</p>;
  }

  // Single-variant products need no picker, just the button.
  const showPicker = product.variants.length > 1;

  return (
    <div className="grid gap-[26px]">
      {showPicker
        ? optionNames.map((optionName) => (
            <fieldset key={optionName}>
              <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]">
                {optionName}
                {selected?.options[optionName] ? (
                  <span className="ml-3 text-pale-muted">{selected.options[optionName]}</span>
                ) : null}
              </legend>
              <div className="flex flex-wrap gap-2">
                {valueStates(product.variants, selected, optionName).map((state) => (
                  <button
                    key={state.value}
                    type="button"
                    onClick={() => {
                      const next = chooseValue(product.variants, selected, optionName, state.value);
                      if (next) onSelect(next);
                    }}
                    disabled={!state.available}
                    aria-pressed={state.selected}
                    aria-label={state.available ? state.value : `${state.value}, sold out`}
                    className={[
                      "grid h-14 min-w-14 place-items-center border-[1.5px] px-3.5 text-[15px] font-bold transition-colors duration-[180ms]",
                      state.selected
                        ? "border-pale-ink bg-pale-ink text-ink"
                        : state.availableWithCurrent
                          ? "border-pale-ink text-pale-ink hover:bg-pale-ink/10"
                          : "border-pale-ink/45 text-pale-muted hover:border-pale-ink",
                      // Sold out everywhere stays readable: dimmed and struck, never removed.
                      !state.available
                        ? "cursor-not-allowed border-pale-ink/30 text-pale-muted/70 line-through hover:bg-transparent"
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

      <div className="grid gap-3">
        {selected ? (
          <p
            className={`text-xs font-semibold uppercase tracking-[0.14em] ${
              selected.purchasable ? "text-pale-muted" : "font-bold"
            }`}
          >
            {STOCK_STATE_LABEL[selected.stockState]}
          </p>
        ) : null}
        <AddToBag
          variantId={selected?.id}
          purchasable={Boolean(selected?.purchasable)}
          title={product.title}
          className="pill pill-ink pill-wide"
          buttonRef={addButtonRef}
        />
      </div>
    </div>
  );
}

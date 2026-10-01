import type { CatalogVariant } from "@/lib/catalog/queries";

/**
 * Choosing a variant by its options — pure, shared by the product page and
 * the tests.
 *
 * The picker used to map every option value to the FIRST variant carrying it.
 * With one option that is fine; with two it is not: on the Original Era Set,
 * tapping "Blue" jumped to "S / Blue" whatever size was chosen, and "M / Blue"
 * could never be reached. Here a tap changes ONE option and keeps the others,
 * and only when that exact combination cannot be bought does it move to the
 * nearest one that can.
 */

/** Option names in the order they first appear across the variants. */
export function optionNamesOf(variants: readonly CatalogVariant[]): string[] {
  const names: string[] = [];
  for (const variant of variants) {
    for (const name of Object.keys(variant.options)) {
      if (!names.includes(name)) names.push(name);
    }
  }
  return names;
}

/** What the page opens on: the first variant that can be bought. */
export function initialVariant(variants: readonly CatalogVariant[]): CatalogVariant | undefined {
  return variants.find((v) => v.purchasable) ?? variants[0];
}

/** The variant with `name` set to `value` and every other option unchanged. */
export function exactMatch(
  variants: readonly CatalogVariant[],
  current: CatalogVariant | undefined,
  name: string,
  value: string,
): CatalogVariant | undefined {
  const names = optionNamesOf(variants);
  return variants.find(
    (v) =>
      v.options[name] === value &&
      names.every((other) => other === name || v.options[other] === current?.options[other]),
  );
}

/** The variant a tap on `value` should select. */
export function chooseValue(
  variants: readonly CatalogVariant[],
  current: CatalogVariant | undefined,
  name: string,
  value: string,
): CatalogVariant | undefined {
  const exact = exactMatch(variants, current, name, value);
  if (exact?.purchasable) return exact;
  // Keep as much of the current choice as possible: the purchasable variant
  // with this value that shares the most other options.
  const names = optionNamesOf(variants).filter((n) => n !== name);
  const candidates = variants
    .filter((v) => v.options[name] === value && v.purchasable)
    .map((v) => ({ v, shared: names.filter((n) => v.options[n] === current?.options[n]).length }));
  candidates.sort((a, b) => b.shared - a.shared);
  return candidates[0]?.v ?? exact ?? variants.find((v) => v.options[name] === value);
}

export type ValueState = {
  value: string;
  selected: boolean;
  /** Some variant with this value can be bought. False: struck through, disabled. */
  available: boolean;
  /** This value together with the other current choices can be bought. */
  availableWithCurrent: boolean;
};

/** Every value of one option, in variant order, with what a tap would do. */
export function valueStates(
  variants: readonly CatalogVariant[],
  current: CatalogVariant | undefined,
  name: string,
): ValueState[] {
  const values: string[] = [];
  for (const variant of variants) {
    const value = variant.options[name];
    if (value && !values.includes(value)) values.push(value);
  }
  return values.map((value) => ({
    value,
    selected: current?.options[name] === value,
    available: variants.some((v) => v.options[name] === value && v.purchasable),
    availableWithCurrent: Boolean(exactMatch(variants, current, name, value)?.purchasable),
  }));
}

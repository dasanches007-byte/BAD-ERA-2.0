/**
 * New product — client-safe shapes and the pure rules that turn the owner's
 * answers into options and variants.
 *
 * Pure on purpose: the form previews exactly what will be created, the server
 * action builds the real payload from the same functions, and the unit tests
 * exercise both without a database. `studio_create_product` (migration 0017)
 * re-checks every rule that matters, so nothing here is the boundary.
 */

/** Apparel sizes. S / M / L / XL only — 2XL is superseded and invalid. */
export const SIZES = ["S", "M", "L", "XL"] as const;
export type Size = (typeof SIZES)[number];

export const ARCHIVE_TAG = "archive-01";

/** A product the owner may build a set from. */
export type SetPieceCandidate = {
  productId: string;
  title: string;
  handle: string;
  productType: string | null;
  /** Option names in display order. */
  optionNames: string[];
  /** Active variants, each with one value per option in `optionNames` order. */
  variants: { id: string; title: string; values: string[] }[];
};

export type NewProductInput = {
  kind: "standard" | "bundle";
  title: string;
  handle: string;
  subtitle: string;
  productType: string;
  archive01: boolean;
  priceCents: number;
  /** Single products: which sizes it comes in (empty = no size option). */
  sizes: Size[];
  /** Single products: one more option, e.g. Color: Black / Red / Blue. */
  second: { name: string; values: string[] } | null;
  /** Single products: starting stock per variant, keyed by `variantKey`. */
  stock: Record<string, number>;
  /** Sets: the products it is made of, each with a short label ("Tee"). */
  pieces: { productId: string; label: string }[];
};

/** Payload for `studio_create_product`. */
export type CreateProductPayload = {
  handle: string;
  title: string;
  subtitle: string | null;
  product_type: string | null;
  tags: string[];
  kind: "standard" | "bundle";
  options: { name: string; values: string[] }[];
  variants: {
    option_values: string[];
    title: string;
    price_cents: number;
    starting_stock?: number;
    components?: { variant_id: string; quantity: number }[];
  }[];
};

export const MAX_VARIANTS = 100;
export const MAX_OPTIONS = 3;

/** Stable key for a combination of choices, e.g. "M|Black". */
export function variantKey(values: readonly string[]): string {
  return values.join("|");
}

/** Readable title for a combination, e.g. "M / Black". */
export function variantTitle(values: readonly string[]): string {
  return values.length > 0 ? values.join(" / ") : "Default";
}

/** "BAD ERA Original Tee" -> "bad-era-original-tee". */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}

/** Dollars typed by a person ("30", "$30.00", "29.5") -> cents, or null. */
export function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** Every combination of the given option values, in order. */
export function combinations(options: readonly { values: readonly string[] }[]): string[][] {
  return options.reduce<string[][]>(
    (rows, option) => rows.flatMap((row) => option.values.map((value) => [...row, value])),
    [[]],
  );
}

/** A single product's options: sizes first (in S-M-L-XL order), then one more. */
export function standardOptions(
  sizes: readonly Size[],
  second: NewProductInput["second"],
): { name: string; values: string[] }[] {
  const options: { name: string; values: string[] }[] = [];
  const ordered = SIZES.filter((size) => sizes.includes(size));
  if (ordered.length > 0) options.push({ name: "Size", values: [...ordered] });
  if (second) {
    const values = dedupe(second.values.map((v) => v.trim()).filter(Boolean));
    if (second.name.trim() && values.length > 0) {
      options.push({ name: second.name.trim(), values });
    }
  }
  return options;
}

/**
 * A set's options and variants, from the pieces it is made of.
 *
 * Each piece contributes its own options, named after the piece ("Tee Size",
 * "Bag Color"), and every combination of the pieces' variants becomes one
 * choice of the set — Tee S/M/L × Bag Black/Red/Blue is nine. Each choice
 * records exactly which variants it is made of, so a paid set decrements the
 * real tee and the real bag.
 */
export function expandSet(
  pieces: readonly { label: string; candidate: SetPieceCandidate }[],
): {
  options: { name: string; values: string[] }[];
  variants: { values: string[]; componentIds: string[] }[];
} {
  const options: { name: string; values: string[] }[] = [];
  for (const { label, candidate } of pieces) {
    candidate.optionNames.forEach((name, index) => {
      options.push({
        name: `${label.trim()} ${name}`.trim(),
        values: dedupe(candidate.variants.map((v) => v.values[index]).filter(Boolean)),
      });
    });
  }

  let rows: { values: string[]; componentIds: string[] }[] = [{ values: [], componentIds: [] }];
  for (const { candidate } of pieces) {
    rows = rows.flatMap((row) =>
      candidate.variants.map((variant) => ({
        values: [...row.values, ...variant.values],
        componentIds: [...row.componentIds, variant.id],
      })),
    );
  }

  return { options, variants: rows };
}

/** Problems a person can fix, in plain words. Empty means ready to create. */
export function checkNewProduct(
  input: NewProductInput,
  candidates: readonly SetPieceCandidate[],
): string[] {
  const problems: string[] = [];
  if (!input.title.trim()) problems.push("Give the product a name.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.handle)) {
    problems.push("The web address can only use lower-case letters, numbers and hyphens.");
  }
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
    problems.push("Enter a price, like 30 or 29.50.");
  }

  if (input.kind === "standard") {
    const options = standardOptions(input.sizes, input.second);
    if (input.second && !input.second.name.trim()) {
      problems.push("Name the second option, for example Color.");
    }
    if (input.second && input.second.values.every((v) => !v.trim())) {
      problems.push(`Add at least one ${input.second.name.trim() || "choice"}.`);
    }
    if (combinations(options).length > MAX_VARIANTS) {
      problems.push(`That makes more than ${MAX_VARIANTS} variants.`);
    }
    for (const count of Object.values(input.stock)) {
      if (!Number.isInteger(count) || count < 0) {
        problems.push("Stock counts must be whole numbers, zero or more.");
        break;
      }
    }
  } else {
    if (input.pieces.length < 2) problems.push("A set is made of at least two products.");
    const ids = input.pieces.map((p) => p.productId);
    if (new Set(ids).size !== ids.length) problems.push("Each product can only be in the set once.");
    const resolved = input.pieces.map((p) => candidates.find((c) => c.productId === p.productId));
    if (resolved.some((c) => !c)) problems.push("Choose a product for every piece.");
    if (resolved.some((c) => c && c.variants.length === 0)) {
      problems.push("One of the pieces has no active variants yet.");
    }
    if (input.pieces.some((p) => !p.label.trim())) problems.push("Give every piece a short label, like Tee.");
    if (resolved.every(Boolean)) {
      const set = expandSet(
        input.pieces.map((p, i) => ({ label: p.label, candidate: resolved[i] as SetPieceCandidate })),
      );
      if (set.options.length > MAX_OPTIONS) {
        problems.push("A set can combine up to three choices in total (for example size and colour).");
      }
      if (set.variants.length > MAX_VARIANTS) problems.push(`That makes more than ${MAX_VARIANTS} combinations.`);
      const names = set.options.map((o) => o.name.toLowerCase());
      if (new Set(names).size !== names.length) {
        problems.push("Two pieces share a label. Give each piece its own, like Tee and Bag.");
      }
    }
  }

  return problems;
}

/** Turn the owner's answers into the database payload. */
export function buildCreatePayload(
  input: NewProductInput,
  candidates: readonly SetPieceCandidate[],
): CreateProductPayload {
  const base = {
    handle: input.handle,
    title: input.title.trim(),
    subtitle: input.subtitle.trim() || null,
    product_type: input.productType.trim() || null,
    tags: input.archive01 ? [ARCHIVE_TAG] : [],
  };

  if (input.kind === "standard") {
    const options = standardOptions(input.sizes, input.second);
    return {
      ...base,
      kind: "standard",
      options,
      variants: combinations(options).map((values) => ({
        option_values: values,
        title: variantTitle(values),
        price_cents: input.priceCents,
        starting_stock: input.stock[variantKey(values)] ?? 0,
      })),
    };
  }

  const set = expandSet(
    input.pieces.map((piece) => {
      const candidate = candidates.find((c) => c.productId === piece.productId);
      if (!candidate) throw new Error(`Unknown set piece ${piece.productId}`);
      return { label: piece.label, candidate };
    }),
  );
  return {
    ...base,
    kind: "bundle",
    options: set.options,
    variants: set.variants.map((row) => ({
      option_values: row.values,
      title: variantTitle(row.values),
      price_cents: input.priceCents,
      components: row.componentIds.map((id) => ({ variant_id: id, quantity: 1 })),
    })),
  };
}

/**
 * Archive 01 starters (locked product contract, CLAUDE.md "ARCHIVE 01").
 *
 * Names, prices and choices come from the contract. Stock counts are left
 * empty — the owner counts the real pieces; nothing here invents a number.
 * The web addresses match the homepage's "From the archive" section, so it
 * finds them without being re-pointed.
 */
export type Starter = {
  key: string;
  label: string;
  input: Omit<NewProductInput, "stock" | "pieces"> & {
    pieces: { handle: string; label: string }[];
  };
};

export const ARCHIVE_STARTERS: Starter[] = [
  {
    key: "tee",
    label: "Archive 01 Tee",
    input: {
      kind: "standard",
      title: "BAD ERA Original Tee",
      handle: "bad-era-original-tee",
      subtitle: "Black",
      productType: "Tee",
      archive01: true,
      priceCents: 3000,
      sizes: ["S", "M", "L"],
      second: null,
      pieces: [],
    },
  },
  {
    key: "crossbody",
    label: "Archive 01 Crossbody",
    input: {
      kind: "standard",
      title: "BAD ERA Original Crossbody",
      handle: "bad-era-original-crossbody",
      subtitle: "",
      productType: "Bag",
      archive01: true,
      priceCents: 2500,
      sizes: [],
      second: { name: "Color", values: ["Black", "Red", "Blue"] },
      pieces: [],
    },
  },
  {
    key: "set",
    label: "Original Era Set",
    input: {
      kind: "bundle",
      title: "Original Era Set",
      handle: "original-era-set",
      subtitle: "1 Tee + 1 Crossbody",
      productType: "Set",
      archive01: true,
      priceCents: 4500,
      sizes: [],
      second: null,
      pieces: [
        { handle: "bad-era-original-tee", label: "Tee" },
        { handle: "bad-era-original-crossbody", label: "Bag" },
      ],
    },
  },
];

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

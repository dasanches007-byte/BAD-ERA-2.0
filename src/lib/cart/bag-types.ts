import type { SiteBagSection } from "@/lib/cms/sections";

/**
 * The bag as the storefront draws it: the slide-in bag, the count in the
 * header. Client-safe shapes only — the read that builds them is server-only
 * (`lib/cart/bag.ts`).
 *
 * Every number here was worked out on the server from current prices. The
 * browser shows them; it never sends one back.
 */

export type BagLine = {
  itemId: string;
  productHandle: string;
  title: string;
  /** The chosen options in words, e.g. "Size M · Color Blue". Empty for a piece with none. */
  detail: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  currency: string;
  /** The piece's photo: the chosen variant's own, else its main one. */
  photo: { url: string; alt: string; focal: { x: number; y: number } } | null;
  /** False once the bag holds every one that can be sold, or the per-line limit. */
  canAddOne: boolean;
  /** Why the line needs a look, when it does. Never colour alone. */
  flag: string | null;
};

export type BagView = {
  lines: BagLine[];
  /** Pieces, not lines: two of one tee count twice. */
  count: number;
  subtotalCents: number;
  currency: string;
  /** True when something in the bag can no longer be bought as it stands. */
  blocked: boolean;
};

export const EMPTY_BAG: BagView = {
  lines: [],
  count: 0,
  subtotalCents: 0,
  currency: "USD",
  blocked: false,
};

/** The owner's words for the bag and the buy buttons (Studio → Site → Menu & footer). */
export type BagWords = Pick<
  SiteBagSection,
  | "title"
  | "emptyText"
  | "keepShopping"
  | "subtotalLabel"
  | "shippingNote"
  | "checkoutLabel"
  | "addToBag"
  | "added"
  | "soldOut"
  | "chooseOptions"
>;

export function bagWordsOf(section: SiteBagSection): BagWords {
  return {
    title: section.title,
    emptyText: section.emptyText,
    keepShopping: section.keepShopping,
    subtotalLabel: section.subtotalLabel,
    shippingNote: section.shippingNote,
    checkoutLabel: section.checkoutLabel,
    addToBag: section.addToBag,
    added: section.added,
    soldOut: section.soldOut,
    chooseOptions: section.chooseOptions,
  };
}

"use client";

import { createContext, useContext } from "react";

import { EMPTY_BAG, type BagView, type BagWords } from "@/lib/cart/bag-types";

/**
 * What the storefront's buttons share: the bag, the owner's words for it, and
 * how to open it.
 *
 * Provided by `StorefrontShell`. Outside one — a unit test, or a component
 * drawn on its own — everything still renders: the bag is empty, the words
 * are the shipped ones and the buttons are plain links.
 */

export const SHIPPED_BAG_WORDS: BagWords = {
  title: "Your bag",
  emptyText: "Your bag is empty.",
  keepShopping: "Keep shopping",
  subtotalLabel: "Subtotal",
  shippingNote: "Flat-rate shipping and any applicable tax are calculated at checkout.",
  checkoutLabel: "Checkout",
  addToBag: "Add to bag",
  added: "Added",
  soldOut: "Sold out",
  chooseOptions: "Choose options",
};

export type AddResult = { ok: true } | { ok: false; message: string };

export type Shop = {
  bag: BagView;
  words: BagWords;
  /** False in the editors: the bag and the menu do not open there. */
  interactive: boolean;
  bagOpen: boolean;
  openBag: (opener?: HTMLElement | null) => void;
  openMenu: (opener?: HTMLElement | null) => void;
  /** Put one of a variant in the bag, then slide the bag in. */
  add: (variantId: string, opener?: HTMLElement | null) => Promise<AddResult>;
  /** Take the bag a cart change on another part of the page returned. */
  adopt: (bag: BagView | null) => void;
};

const NOT_INTERACTIVE: Shop = {
  bag: EMPTY_BAG,
  words: SHIPPED_BAG_WORDS,
  interactive: false,
  bagOpen: false,
  openBag: () => {},
  openMenu: () => {},
  add: async () => ({ ok: false, message: "The bag is not available here." }),
  adopt: () => {},
};

export const ShopContext = createContext<Shop>(NOT_INTERACTIVE);

export function useShop(): Shop {
  return useContext(ShopContext);
}

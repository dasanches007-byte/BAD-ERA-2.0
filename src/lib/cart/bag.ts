import "server-only";

import { EMPTY_BAG, type BagLine, type BagView } from "@/lib/cart/bag-types";
import { getCart, MAX_LINE_QUANTITY, type CartLine } from "@/lib/cart/service";
import { resolveExistingCartId } from "@/lib/cart/session";
import { resolvePhotos, type CatalogPhoto } from "@/lib/catalog/queries";
import { STOCK_STATE_LABEL } from "@/lib/inventory/availability";

/**
 * The bag, for the slide-in bag and the header's count.
 *
 * Built from `getCart`, so prices and availability are the same fresh,
 * server-derived values the cart page and checkout use. Nothing is reserved
 * and nothing is created: a visitor without a cart has an empty bag.
 */

function photoFor(line: CartLine, photos: CatalogPhoto[]): BagLine["photo"] {
  // The chosen variant's own photo if it has one, else the piece's main photo
  // — never a photo that belongs to a different variant.
  const photo =
    photos.find((p) => p.variantId === line.variantId) ??
    photos.find((p) => p.variantId === null) ??
    null;
  return photo ? { url: photo.url, alt: photo.alt, focal: photo.focal } : null;
}

function toBagLine(line: CartLine, photos: CatalogPhoto[]): BagLine {
  const detail = Object.entries(line.options)
    .map(([name, value]) => `${name} ${value}`)
    .join(" · ");
  const roomInStock = line.sellableQuantity === null || line.quantity < line.sellableQuantity;
  return {
    itemId: line.itemId,
    productHandle: line.productHandle,
    title: line.productTitle,
    detail,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    lineTotalCents: line.lineTotalCents,
    currency: line.currency,
    photo: photoFor(line, photos),
    canAddOne: roomInStock && line.quantity < MAX_LINE_QUANTITY,
    flag: line.needsAttention
      ? `Only ${line.sellableQuantity} available`
      : line.stockState === "sold_out"
        ? STOCK_STATE_LABEL.sold_out
        : null,
  };
}

export async function getBagView(cartId: string | null): Promise<BagView> {
  if (!cartId) return EMPTY_BAG;
  const cart = await getCart(cartId);
  if (!cart) return EMPTY_BAG;

  const products = [
    ...new Map(cart.lines.map((l) => [l.productId, { id: l.productId, title: l.productTitle }])).values(),
  ];
  // Thumbnails are a courtesy. A bag without them still shows every piece,
  // price and total, so a failed photo read never fails the bag.
  const photos = await resolvePhotos(products).catch((error) => {
    console.error("[bad-era] bag photos read failed; showing the bag without them", error);
    return new Map<string, CatalogPhoto[]>();
  });

  const lines = cart.lines.map((line) => toBagLine(line, photos.get(line.productId) ?? []));
  return {
    lines,
    count: lines.reduce((n, line) => n + line.quantity, 0),
    subtotalCents: cart.subtotalCents,
    currency: cart.currency,
    blocked: cart.hasBlockingIssues,
  };
}

/**
 * The visitor's bag for a page render. Never throws and never creates a
 * cart: the storefront must draw its header whether or not the bag can be
 * read, and a failed read is an empty bag here and a loud log line.
 */
export async function readBagForRender(): Promise<BagView> {
  try {
    return await getBagView(await resolveExistingCartId());
  } catch (error) {
    console.error("[bad-era] bag read failed; rendering an empty bag", error);
    return EMPTY_BAG;
  }
}

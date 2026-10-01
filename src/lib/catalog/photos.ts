import { emptyMedia, type MediaSlot } from "@/lib/cms/sections";
import type { CatalogPhoto } from "@/lib/catalog/queries";

/**
 * Turning a product's photos into what each surface shows. Pure, so cards,
 * the product page and the tests all agree.
 */

/** The main photo: the owner's first. Cards always show this one. */
export function mainPhoto(photos: readonly CatalogPhoto[]): CatalogPhoto | undefined {
  return photos[0];
}

/**
 * The product page gallery for the chosen variant: that variant's own photos
 * first, then the ones shown for every variant. Photos that belong to a
 * DIFFERENT variant are left out — picking Blue never shows the red bag.
 * Should that leave nothing, every photo is shown rather than none.
 */
export function galleryFor(
  photos: readonly CatalogPhoto[],
  variantId: string | undefined,
): CatalogPhoto[] {
  const own = variantId ? photos.filter((p) => p.variantId === variantId) : [];
  const shared = photos.filter((p) => p.variantId === null);
  const gallery = [...own, ...shared];
  return gallery.length > 0 ? gallery : [...photos];
}

/** A photo as a MediaSlot (or the polished placeholder when there is none). */
export function photoSlot(photo: CatalogPhoto | undefined, title: string): MediaSlot {
  if (!photo) return emptyMedia(title, title);
  return {
    mediaAssetId: null,
    url: photo.url,
    alt: photo.alt || title,
    focalDesktop: photo.focal,
    focalMobile: photo.focal,
    placeholderLabel: title,
  };
}

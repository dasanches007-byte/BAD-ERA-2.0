/**
 * Client-safe shapes for a product's photos (Studio → Products → Photos).
 *
 * A product photo is a link from a product to a Media Library asset
 * (`product_media`): its order, the one point that must stay in frame when it
 * is cropped, and optionally the one variant it belongs to — so choosing
 * "Blue" on the product page shows the blue bag first. The description (alt
 * text) lives on the asset itself, shared by everywhere the photo is used.
 */
export type StudioProductPhoto = {
  id: string;
  mediaAssetId: string;
  url: string;
  alt: string;
  focal: { x: number; y: number };
  /** Null: shown whatever the customer chooses. */
  variantId: string | null;
  position: number;
};

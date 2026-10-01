import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import { PUBLIC_BUCKET } from "@/lib/studio/media-types";
import type { StudioProductPhoto } from "@/lib/studio/product-photo-types";

export type { StudioProductPhoto } from "@/lib/studio/product-photo-types";

/**
 * A product's photos, in order. Only photos that can actually be shown — a
 * public, unarchived image — are returned; anything else would be a broken
 * tile in Studio and a missing one on the store.
 */
export async function getProductPhotos(productId: string): Promise<StudioProductPhoto[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("product_media")
    .select(
      "id, media_asset_id, variant_id, position, focal_x, focal_y, created_at, media_assets(bucket, storage_path, alt_text, kind, archived_at)",
    )
    .eq("product_id", productId)
    .order("position")
    .order("created_at");

  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const asset = row.media_assets;
    if (!asset || asset.bucket !== PUBLIC_BUCKET || asset.archived_at || asset.kind !== "image") {
      return [];
    }
    return [
      {
        id: row.id,
        mediaAssetId: row.media_asset_id,
        url: db.storage.from(asset.bucket).getPublicUrl(asset.storage_path).data.publicUrl,
        alt: asset.alt_text ?? "",
        focal: { x: num(row.focal_x, 0.5), y: num(row.focal_y, 0.5) },
        variantId: row.variant_id,
        position: row.position,
      },
    ];
  });
}

function num(value: number | string | null, fallback: number): number {
  const n = value === null ? NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

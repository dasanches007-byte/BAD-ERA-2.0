import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import { PUBLIC_BUCKET } from "@/lib/studio/media-types";
import type { MediaAsset } from "@/lib/studio/media-types";

/**
 * Media Library reads (Master Spec §12).
 *
 * This is a critical module: the owner adds final photography AFTER the site is
 * built, so every image on the storefront is a slot that resolves through here.
 * Replacing a placeholder must never require a code change or a redeploy.
 */

export { PUBLIC_BUCKET, PRIVATE_BUCKET } from "@/lib/studio/media-types";
export type { MediaAsset } from "@/lib/studio/media-types";

export async function listMedia(): Promise<MediaAsset[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("media_assets")
    .select(
      "id, bucket, storage_path, original_filename, mime_type, byte_size, width, height, alt_text, status, kind, created_at, media_asset_usages(id), product_media(id)",
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((m) => {
    // Product photos link straight to the asset rather than through
    // media_asset_usages, so both count as "in use".
    const usages = [...(m.media_asset_usages ?? []), ...(m.product_media ?? [])];
    return {
      id: m.id,
      bucket: m.bucket,
      storagePath: m.storage_path,
      publicUrl:
        m.bucket === PUBLIC_BUCKET
          ? db.storage.from(m.bucket).getPublicUrl(m.storage_path).data.publicUrl
          : null,
      originalFilename: m.original_filename,
      mimeType: m.mime_type,
      byteSize: m.byte_size === null ? null : Number(m.byte_size),
      width: m.width,
      height: m.height,
      altText: m.alt_text,
      status: m.status,
      kind: m.kind,
      createdAt: m.created_at,
      usageCount: usages.length,
    };
  });
}

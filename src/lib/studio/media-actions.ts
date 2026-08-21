"use server";

import { revalidatePath } from "next/cache";

import { requireStudioOwner, StudioAuthorizationError } from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";
import { PUBLIC_BUCKET } from "@/lib/studio/media-types";

/**
 * Media mutations (Master Spec §12).
 *
 * Uploads go through a Server Action rather than a direct browser-to-Storage
 * call, so authorization is verified server-side before a single byte is
 * written. The Storage RLS policies in migration 0012 remain as a second layer.
 *
 * Deletes are ARCHIVES. An asset referenced by a live page or product must
 * never vanish underneath it — prefer archive over destructive delete.
 */

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
]);

const MAX_BYTES = 26214400; // 25 MB, matching the bucket limit.

export type MediaActionResult =
  | { ok: true; assetId: string }
  | { ok: false; message: string };

export async function uploadMediaAction(
  formData: FormData,
): Promise<MediaActionResult> {
  try {
    await requireStudioOwner();
  } catch (error) {
    if (error instanceof StudioAuthorizationError) {
      return { ok: false, message: "Studio authorization required." };
    }
    throw error;
  }

  const file = formData.get("file");
  const altText = String(formData.get("altText") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a file to upload." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, message: `${file.type || "That file type"} is not allowed.` };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "That file is larger than 25 MB." };
  }

  const db = createAdminClient();

  // Content-addressed enough to avoid collisions, still readable in the
  // Storage browser.
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const storagePath = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await db.storage
    .from(PUBLIC_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    console.error("[bad-era] media upload failed", uploadError);
    return { ok: false, message: uploadError.message };
  }

  const { data, error } = await db
    .from("media_assets")
    .insert({
      bucket: PUBLIC_BUCKET,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      byte_size: file.size,
      alt_text: altText || null,
      kind: file.type.startsWith("video/") ? "video" : "image",
      // Uploaded assets start as drafts; approving is a deliberate step.
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    // The row failed, so do not leave an orphan object behind.
    await db.storage.from(PUBLIC_BUCKET).remove([storagePath]);
    console.error("[bad-era] media record insert failed", error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/studio/media");
  return { ok: true, assetId: data.id };
}

export async function updateMediaAltTextAction(
  assetId: string,
  altText: string,
): Promise<MediaActionResult> {
  try {
    await requireStudioOwner();
  } catch (error) {
    if (error instanceof StudioAuthorizationError) {
      return { ok: false, message: "Studio authorization required." };
    }
    throw error;
  }

  const db = createAdminClient();
  const { error } = await db
    .from("media_assets")
    .update({ alt_text: altText.trim() || null })
    .eq("id", assetId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/studio/media");
  return { ok: true, assetId };
}

/**
 * Archive an asset.
 *
 * Refuses while the asset is still referenced, rather than breaking a live page
 * (Master Spec §12: warn before deleting a referenced asset; prefer archive).
 */
export async function archiveMediaAction(
  assetId: string,
): Promise<MediaActionResult> {
  try {
    await requireStudioOwner();
  } catch (error) {
    if (error instanceof StudioAuthorizationError) {
      return { ok: false, message: "Studio authorization required." };
    }
    throw error;
  }

  const db = createAdminClient();

  const { count, error: usageError } = await db
    .from("media_asset_usages")
    .select("id", { count: "exact", head: true })
    .eq("media_asset_id", assetId);

  if (usageError) return { ok: false, message: usageError.message };

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: `Still used in ${count} place${count === 1 ? "" : "s"}. Replace it there first.`,
    };
  }

  const { error } = await db
    .from("media_assets")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", assetId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/studio/media");
  return { ok: true, assetId };
}

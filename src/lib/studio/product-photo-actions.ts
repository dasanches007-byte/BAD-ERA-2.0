"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStudioOwner, StudioAuthorizationError } from "@/lib/auth/studio";
import { invalidateCatalog } from "@/lib/catalog/invalidate";
import { createAdminClient } from "@/lib/db/admin";
import { PUBLIC_BUCKET } from "@/lib/studio/media-types";

/**
 * Product photos (Studio → Products → Photos).
 *
 * A photo is a `product_media` row pointing at a Media Library asset. Removing
 * one removes that link only — the photo stays in the library, and archiving
 * it there is refused while a product still shows it.
 *
 * Every action re-checks that the photo belongs to the product named, so a
 * stale tab or a hand-made request cannot move another product's photos.
 */

export type PhotoResult = { ok: true } | { ok: false; message: string };

async function owner(): Promise<PhotoResult> {
  try {
    await requireStudioOwner();
    return { ok: true };
  } catch (error) {
    if (error instanceof StudioAuthorizationError) {
      return { ok: false, message: "Studio authorization required." };
    }
    throw error;
  }
}

const uuid = z.uuid();
const MAX_PHOTOS = 30;

/** After any change: Studio's view and the storefront's cached catalog. */
async function refresh(productId: string): Promise<void> {
  const db = createAdminClient();
  const { data } = await db.from("products").select("handle").eq("id", productId).maybeSingle();
  revalidatePath(`/studio/products/${productId}/photos`);
  revalidatePath(`/studio/products/${productId}`);
  invalidateCatalog(data ? String(data.handle) : null);
}

/** Add library photos to a product, after the ones it already has. */
export async function addProductPhotosAction(input: {
  productId: string;
  mediaAssetIds: string[];
}): Promise<PhotoResult> {
  const auth = await owner();
  if (!auth.ok) return auth;

  const parsed = z
    .object({ productId: uuid, mediaAssetIds: z.array(uuid).min(1).max(MAX_PHOTOS) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose at least one photo." };
  const { productId } = parsed.data;
  const requested = [...new Set(parsed.data.mediaAssetIds)];

  const db = createAdminClient();

  const { data: product, error: productError } = await db
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (productError) return { ok: false, message: productError.message };
  if (!product) return { ok: false, message: "That product no longer exists." };

  // Only photos the storefront can show: public, unarchived images.
  const { data: assets, error: assetError } = await db
    .from("media_assets")
    .select("id")
    .in("id", requested)
    .eq("bucket", PUBLIC_BUCKET)
    .eq("kind", "image")
    .is("archived_at", null);
  if (assetError) return { ok: false, message: assetError.message };
  const usable = new Set((assets ?? []).map((a) => a.id));

  const { data: existing, error: existingError } = await db
    .from("product_media")
    .select("media_asset_id, variant_id, position")
    .eq("product_id", productId);
  if (existingError) return { ok: false, message: existingError.message };

  // Already on the product for every choice: adding it again would show the
  // same photo twice.
  const already = new Set(
    (existing ?? []).filter((row) => row.variant_id === null).map((row) => row.media_asset_id),
  );
  const toAdd = requested.filter((id) => usable.has(id) && !already.has(id));
  if (toAdd.length === 0) {
    return { ok: false, message: usable.size === 0 ? "Those photos can't be used." : "Those photos are already on this product." };
  }
  if ((existing ?? []).length + toAdd.length > MAX_PHOTOS) {
    return { ok: false, message: `A product can have up to ${MAX_PHOTOS} photos.` };
  }

  const start = Math.max(-1, ...(existing ?? []).map((row) => row.position)) + 1;
  const { error } = await db.from("product_media").insert(
    toAdd.map((mediaAssetId, index) => ({
      product_id: productId,
      media_asset_id: mediaAssetId,
      role: "gallery",
      position: start + index,
    })),
  );
  if (error) return { ok: false, message: error.message };

  await refresh(productId);
  return { ok: true };
}

const updateSchema = z.object({
  productId: uuid,
  photoId: uuid,
  focal: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional(),
  /** Null: shown for every choice. */
  variantId: uuid.nullable().optional(),
  alt: z.string().max(300).optional(),
});

/** Change where a photo is cropped, which choice it belongs to, or its description. */
export async function updateProductPhotoAction(input: z.input<typeof updateSchema>): Promise<PhotoResult> {
  const auth = await owner();
  if (!auth.ok) return auth;

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid change." };
  const { productId, photoId, focal, variantId, alt } = parsed.data;

  const db = createAdminClient();
  const { data: photo, error: readError } = await db
    .from("product_media")
    .select("id, media_asset_id")
    .eq("id", photoId)
    .eq("product_id", productId)
    .maybeSingle();
  if (readError) return { ok: false, message: readError.message };
  if (!photo) return { ok: false, message: "That photo is no longer on this product." };

  if (variantId) {
    const { data: variant } = await db
      .from("product_variants")
      .select("id")
      .eq("id", variantId)
      .eq("product_id", productId)
      .maybeSingle();
    if (!variant) return { ok: false, message: "That choice is not part of this product." };
  }

  const patch: { focal_x?: number; focal_y?: number; variant_id?: string | null } = {};
  if (focal) {
    patch.focal_x = Math.round(focal.x * 10000) / 10000;
    patch.focal_y = Math.round(focal.y * 10000) / 10000;
  }
  if (variantId !== undefined) patch.variant_id = variantId;

  if (Object.keys(patch).length > 0) {
    const { error } = await db.from("product_media").update(patch).eq("id", photoId);
    if (error) {
      if (error.code === "23505") {
        return { ok: false, message: "This photo is already shown for that choice." };
      }
      return { ok: false, message: error.message };
    }
  }

  if (alt !== undefined) {
    // The description belongs to the photo itself, so it follows it anywhere
    // it is used.
    const { error } = await db
      .from("media_assets")
      .update({ alt_text: alt.trim() || null })
      .eq("id", photo.media_asset_id);
    if (error) return { ok: false, message: error.message };
    revalidatePath("/studio/media");
  }

  await refresh(productId);
  return { ok: true };
}

/** Move a photo one place earlier or later. The first photo is the main one. */
export async function moveProductPhotoAction(input: {
  productId: string;
  photoId: string;
  direction: -1 | 1;
}): Promise<PhotoResult> {
  const auth = await owner();
  if (!auth.ok) return auth;

  const parsed = z
    .object({ productId: uuid, photoId: uuid, direction: z.union([z.literal(-1), z.literal(1)]) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid move." };
  const { productId, photoId, direction } = parsed.data;

  const db = createAdminClient();
  const { data: rows, error } = await db
    .from("product_media")
    .select("id, position, created_at")
    .eq("product_id", productId)
    .order("position")
    .order("created_at");
  if (error) return { ok: false, message: error.message };

  const order = (rows ?? []).map((row) => row.id);
  const from = order.indexOf(photoId);
  if (from === -1) return { ok: false, message: "That photo is no longer on this product." };
  const to = from + direction;
  if (to < 0 || to >= order.length) return { ok: true };

  [order[from], order[to]] = [order[to], order[from]];

  // Renumber everything 0..n so positions stay unique and gap-free, whatever
  // state earlier edits left them in.
  for (const [position, id] of order.entries()) {
    const current = rows?.find((row) => row.id === id)?.position;
    if (current === position) continue;
    const { error: writeError } = await db.from("product_media").update({ position }).eq("id", id);
    if (writeError) return { ok: false, message: writeError.message };
  }

  await refresh(productId);
  return { ok: true };
}

/** Take a photo off this product. The photo stays in the Media Library. */
export async function removeProductPhotoAction(input: {
  productId: string;
  photoId: string;
}): Promise<PhotoResult> {
  const auth = await owner();
  if (!auth.ok) return auth;

  const parsed = z.object({ productId: uuid, photoId: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const db = createAdminClient();
  const { error, count } = await db
    .from("product_media")
    .delete({ count: "exact" })
    .eq("id", parsed.data.photoId)
    .eq("product_id", parsed.data.productId);
  if (error) return { ok: false, message: error.message };
  if (!count) return { ok: false, message: "That photo is no longer on this product." };

  await refresh(parsed.data.productId);
  return { ok: true };
}

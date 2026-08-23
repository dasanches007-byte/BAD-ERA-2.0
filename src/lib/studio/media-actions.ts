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

/**
 * Magic-byte signatures (Master Spec §17: "Validate uploaded file MIME/magic
 * bytes where relevant; image-only media library should reject unsafe file
 * types").
 *
 * `file.type` is supplied by the BROWSER. Renaming payload.html to payload.png
 * and setting the Content-Type is trivial, so the declared type is a hint, not
 * a fact. These check what the bytes actually are.
 *
 * SVG is the reason this matters most: an SVG is a document that can carry
 * <script>, and it is served from the same Storage origin as everything else.
 * It has no fixed magic number, so it is validated by parsing instead.
 */
const SIGNATURES: { mime: string; offset: number; bytes: number[] }[] = [
  { mime: "image/jpeg", offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // RIFF....WEBP — the container tag sits at offset 8.
  { mime: "image/webp", offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "image/webp", offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  // ISO base media (ftyp) covers both AVIF and MP4.
  { mime: "image/avif", offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { mime: "video/mp4", offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  // EBML header.
  { mime: "video/webm", offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] },
];

function matches(head: Uint8Array, offset: number, bytes: number[]): boolean {
  if (head.length < offset + bytes.length) return false;
  return bytes.every((byte, i) => head[offset + i] === byte);
}

/**
 * Reject anything whose bytes disagree with its declared type.
 *
 * SVG is handled separately: it is text, so it is checked for an actual root
 * <svg> element and then scanned for the constructs that make an SVG dangerous
 * — script elements, event handlers, embedded foreign content and javascript:
 * URLs. An SVG that contains any of them is refused outright rather than
 * sanitised, because a sanitiser is a thing to get subtly wrong and the owner
 * has no need to upload scripted artwork.
 */
async function verifyFileSignature(
  file: File,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());

  if (file.type === "image/svg+xml") {
    const text = new TextDecoder().decode(head).toLowerCase();
    if (!text.includes("<svg") && !text.includes("<?xml")) {
      return { ok: false, message: "That file is not a valid SVG." };
    }

    const full = (await file.text()).toLowerCase();
    const dangerous = [
      "<script",
      "<foreignobject",
      "<use",
      "javascript:",
      "onload=",
      "onerror=",
      "onclick=",
      "onmouseover=",
      "<iframe",
      "<embed",
      "<object",
    ];
    const found = dangerous.find((needle) => full.includes(needle));
    if (found) {
      return {
        ok: false,
        message:
          "That SVG contains scripting or embedded content, so it was not uploaded.",
      };
    }
    return { ok: true };
  }

  const expected = SIGNATURES.filter((sig) => sig.mime === file.type);
  if (expected.length === 0) {
    return { ok: false, message: "That file type is not allowed." };
  }

  const allMatch = expected.every((sig) => matches(head, sig.offset, sig.bytes));
  if (!allMatch) {
    return {
      ok: false,
      message: "That file's contents do not match its type, so it was not uploaded.",
    };
  }

  return { ok: true };
}

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

  // The declared type passed; now check the bytes actually agree with it.
  const signature = await verifyFileSignature(file);
  if (!signature.ok) return signature;

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

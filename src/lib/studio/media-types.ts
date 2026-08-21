import type { Enums } from "@/lib/db/generated.types";

/**
 * Client-safe media types and helpers.
 *
 * Deliberately separate from `media.ts`, which is `server-only` because it
 * constructs the service-role client. A Client Component that needs the shape
 * of a media asset — or to format a byte size — imports from here, so the
 * server-only poison pill never reaches a browser bundle.
 */

export const PUBLIC_BUCKET = "media-public";
export const PRIVATE_BUCKET = "media-private";

export type MediaAsset = {
  id: string;
  bucket: string;
  storagePath: string;
  publicUrl: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  altText: string | null;
  status: Enums<"media_status">;
  kind: Enums<"media_kind">;
  createdAt: string;
  /** Where this asset is currently used. Warn before destructive delete. */
  usageCount: number;
};

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

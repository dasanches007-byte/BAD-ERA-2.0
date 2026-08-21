"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import { StatusChip } from "@/components/studio/primitives";
import {
  archiveMediaAction,
  updateMediaAltTextAction,
  uploadMediaAction,
} from "@/lib/studio/media-actions";
import { formatBytes } from "@/lib/studio/media-types";
import type { MediaAsset } from "@/lib/studio/media-types";

/**
 * Media Library (Master Spec §12).
 *
 * Alt text is a first-class field, not an afterthought: every storefront image
 * slot reads it, and an image without alt text is an accessibility defect
 * waiting to ship.
 *
 * Archiving is refused while an asset is still referenced, so replacing final
 * photography can never silently break a live page.
 */
export function MediaLibrary({ assets }: { assets: MediaAsset[] }) {
  return (
    <div className="space-y-8">
      <Uploader />
      {assets.length === 0 ? (
        <div className="hairline flex min-h-64 flex-col items-center justify-center gap-4 bg-surface-raised px-6 py-16 text-center">
          <p className="label text-ink-subtle">No media yet</p>
          <p className="max-w-md text-sm leading-relaxed text-ink-muted">
            Upload final photography here, then place it into any storefront
            image slot. No code change or redeploy is needed.
          </p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <MediaCard key={asset.id} asset={asset} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Uploader() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          const result = await uploadMediaAction(formData);
          if (result.ok) {
            setMessage({ tone: "ok", text: "Uploaded." });
            formRef.current?.reset();
          } else {
            setMessage({ tone: "error", text: result.message });
          }
        });
      }}
      className="hairline bg-surface-raised p-6"
    >
      <p className="label text-ink-subtle">Upload</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div>
          <label htmlFor="media-file" className="label block text-ink-muted">
            File
          </label>
          <input
            id="media-file"
            name="file"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml,video/mp4,video/webm"
            className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink file:mr-4 file:border-0 file:bg-transparent file:text-ink-muted focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="media-alt" className="label block text-ink-muted">
            Alt text
          </label>
          <input
            id="media-alt"
            name="altText"
            type="text"
            placeholder="Describe the image"
            className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="label border border-ink/70 px-6 py-2.5 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
      <p className="mt-3 text-xs text-ink-subtle">
        JPEG, PNG, WebP, AVIF, SVG, MP4 or WebM. Up to 25 MB.
      </p>
      {message ? (
        <p
          aria-live="polite"
          className={`label mt-4 ${
            message.tone === "ok" ? "text-state-success" : "text-state-critical"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}

function MediaCard({ asset }: { asset: MediaAsset }) {
  const [pending, startTransition] = useTransition();
  const [alt, setAlt] = useState(asset.altText ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isVideo = asset.kind === "video";

  return (
    <li className="hairline flex flex-col bg-surface-raised">
      <div className="relative aspect-square w-full overflow-hidden bg-surface-inset">
        {asset.publicUrl && !isVideo ? (
          <Image
            src={asset.publicUrl}
            alt={asset.altText ?? ""}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="label text-ink-disabled">
              {isVideo ? "Video" : "No preview"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="truncate text-xs text-ink">
          {asset.originalFilename ?? asset.storagePath}
        </p>
        <p className="text-xs text-ink-subtle">
          {formatBytes(asset.byteSize)}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
        </p>

        <div className="flex flex-wrap gap-2">
          <StatusChip tone={asset.status === "approved" ? "success" : "neutral"}>
            {asset.status}
          </StatusChip>
          {asset.usageCount > 0 ? (
            <StatusChip tone="info">
              Used {asset.usageCount}×
            </StatusChip>
          ) : null}
          {!asset.altText ? (
            <StatusChip tone="warning">No alt text</StatusChip>
          ) : null}
        </div>

        <label htmlFor={`alt-${asset.id}`} className="sr-only">
          Alt text
        </label>
        <input
          id={`alt-${asset.id}`}
          type="text"
          value={alt}
          onChange={(e) => {
            setAlt(e.target.value);
            setSaved(false);
          }}
          onBlur={() => {
            if (alt === (asset.altText ?? "")) return;
            setError(null);
            startTransition(async () => {
              const result = await updateMediaAltTextAction(asset.id, alt);
              if (result.ok) setSaved(true);
              else setError(result.message);
            });
          }}
          placeholder="Alt text"
          className="w-full border border-line-strong bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
        />

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span aria-live="polite" className="label text-ink-subtle">
            {pending ? "Saving…" : saved ? "Saved" : ""}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await archiveMediaAction(asset.id);
                if (!result.ok) setError(result.message);
              });
            }}
            className="label text-ink-subtle transition-colors hover:text-state-critical disabled:opacity-50"
          >
            Archive
          </button>
        </div>

        {error ? (
          <p aria-live="polite" className="label text-state-critical">
            {error}
          </p>
        ) : null}
      </div>
    </li>
  );
}

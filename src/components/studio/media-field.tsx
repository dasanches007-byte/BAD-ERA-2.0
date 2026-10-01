"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";

import type { MediaSlot } from "@/lib/cms/sections";
import { uploadMediaAction } from "@/lib/studio/media-actions";
import type { MediaAsset } from "@/lib/studio/media-types";

/**
 * The photo field — shared by the on-page editor and the Site Editor.
 *
 * Built for a phone first: tap a thumbnail to use it, "Upload a photo" to add
 * one straight from the camera roll, and tap the photo itself to say which
 * part must stay in frame when it is cropped. Desktop and mobile crops are set
 * independently, because the same photo is cut differently on each.
 *
 * Still the registry's `media` field kind: an asset id, alt text and two focal
 * points. Nothing here can change how the photo is laid out or styled.
 */

type MediaValue = Omit<MediaSlot, "url">;
type Breakpoint = "desktop" | "mobile";

const MAX_BYTES = 25 * 1024 * 1024;

export function MediaField({
  label,
  value,
  media,
  onChange,
  onUploaded,
}: {
  label: string;
  value: MediaSlot | undefined;
  media: MediaAsset[];
  onChange: (next: MediaValue) => void;
  /** After an upload lands, so the caller can fetch the new library list. */
  onUploaded?: () => void;
}) {
  const slot: MediaValue = strip(
    value ?? {
      mediaAssetId: null,
      alt: "",
      focalDesktop: { x: 0.5, y: 0.5 },
      focalMobile: { x: 0.5, y: 0.5 },
      placeholderLabel: label,
    },
  );
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // A just-uploaded photo is shown from the device until the library list
  // catches up, so the owner sees it immediately.
  const [localPreview, setLocalPreview] = useState<{ id: string; url: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const altId = useId();

  const images = media.filter((asset) => asset.kind === "image" && asset.publicUrl);
  const selected = images.find((asset) => asset.id === slot.mediaAssetId);
  const previewUrl =
    selected?.publicUrl ??
    (localPreview && localPreview.id === slot.mediaAssetId ? localPreview.url : null) ??
    value?.url ??
    null;

  const set = (patch: Partial<MediaValue>) => onChange({ ...slot, ...patch });
  const focal = breakpoint === "desktop" ? slot.focalDesktop : slot.focalMobile;

  async function upload(file: File) {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Choose a photo (JPEG, PNG, WebP or AVIF).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("That photo is larger than 25 MB.");
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    form.set("altText", slot.alt);
    const result = await uploadMediaAction(form).catch(() => ({
      ok: false as const,
      message: "The upload did not go through. Check your connection and try again.",
    }));
    setUploading(false);
    if (!result.ok) {
      setUploadError(result.message);
      return;
    }
    setLocalPreview({ id: result.assetId, url: URL.createObjectURL(file) });
    set({ mediaAssetId: result.assetId });
    onUploaded?.();
  }

  function pickFocal(event: React.MouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const point = {
      x: round(clamp((event.clientX - box.left) / box.width)),
      y: round(clamp((event.clientY - box.top) / box.height)),
    };
    set(breakpoint === "desktop" ? { focalDesktop: point } : { focalMobile: point });
  }

  return (
    <div className="space-y-5">
      {previewUrl ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="label text-ink-muted">Keep in frame</p>
            <div className="flex border border-line-strong" role="group" aria-label="Crop for">
              {(["desktop", "mobile"] as const).map((bp) => (
                <button
                  key={bp}
                  type="button"
                  aria-pressed={breakpoint === bp}
                  onClick={() => setBreakpoint(bp)}
                  className={`label min-h-9 px-3 transition-colors ${
                    breakpoint === bp ? "bg-surface-overlay text-ink" : "text-ink-subtle hover:text-ink"
                  }`}
                >
                  {bp === "desktop" ? "Computer" : "Phone"}
                </button>
              ))}
            </div>
          </div>
          {/* The whole photo, uncropped: tapping it records a point as a
              fraction of its width and height. */}
          <button
            type="button"
            onClick={pickFocal}
            aria-label={`Set the ${breakpoint === "desktop" ? "computer" : "phone"} focus point. Currently ${Math.round(focal.x * 100)}% across, ${Math.round(focal.y * 100)}% down.`}
            className="relative mt-3 block w-full cursor-crosshair overflow-hidden border border-line bg-surface-inset"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- intrinsic aspect ratio is the point; also shows a just-picked local file */}
            <img src={previewUrl} alt="" className="block h-auto max-h-72 w-full object-contain" />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-strong shadow-[0_0_0_2px_rgb(0_0_0/0.6)]"
              style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
            />
          </button>
          <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
            Tap the part of the photo that must never be cropped off on a{" "}
            {breakpoint === "desktop" ? "computer" : "phone"}.
          </p>
        </div>
      ) : (
        <div className="relative flex aspect-[16/10] items-end border border-line bg-[radial-gradient(120%_100%_at_50%_0%,#141312_0%,#0a0a0a_60%,#050505_100%)] p-4">
          <p className="text-xs text-ink-muted">No photo yet — the page shows a placeholder.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="label inline-flex min-h-11 flex-1 items-center justify-center gap-2 border border-ink/70 px-4 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-wait disabled:opacity-60"
        >
          <UploadIcon />
          {uploading ? "Uploading…" : previewUrl ? "Upload a different photo" : "Upload a photo"}
        </button>
        {slot.mediaAssetId ? (
          <button
            type="button"
            onClick={() => set({ mediaAssetId: null })}
            className="label min-h-11 border border-line-strong px-4 text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            Remove
          </button>
        ) : null}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>
      {uploadError ? (
        <p role="alert" className="text-xs text-state-critical">
          {uploadError}
        </p>
      ) : null}

      {images.length > 0 ? (
        <div>
          <p className="label text-ink-muted">Or choose from your library</p>
          <ul className="mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1">
            {images.map((asset) => {
              const active = asset.id === slot.mediaAssetId;
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={`Use ${asset.altText || asset.originalFilename || "this photo"}`}
                    onClick={() =>
                      set({
                        mediaAssetId: asset.id,
                        // Carry the library description over when the slot has none.
                        alt: slot.alt || asset.altText || "",
                      })
                    }
                    className={`relative block aspect-square w-full overflow-hidden bg-surface-inset outline-offset-2 ${
                      active ? "outline outline-2 outline-ink-strong" : "hover:opacity-80"
                    }`}
                  >
                    <Image
                      src={asset.publicUrl as string}
                      alt=""
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div>
        <label htmlFor={altId} className="label block text-ink-muted">
          Describe the photo
        </label>
        <input
          id={altId}
          type="text"
          maxLength={300}
          value={slot.alt}
          onChange={(e) => set({ alt: e.target.value })}
          className="mt-2 min-h-11 w-full border border-line-strong bg-transparent px-3 text-sm text-ink focus:border-ink focus:outline-none"
        />
        <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
          Read aloud to people using screen readers, and shown if the photo cannot load.
        </p>
      </div>
    </div>
  );
}

function strip(value: MediaSlot): MediaValue {
  const { url: _url, ...rest } = value;
  return rest;
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const round = (n: number) => Math.round(n * 100) / 100;

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
    </svg>
  );
}

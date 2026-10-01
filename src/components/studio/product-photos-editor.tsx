"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";

import { uploadMediaAction } from "@/lib/studio/media-actions";
import type { MediaAsset } from "@/lib/studio/media-types";
import {
  addProductPhotosAction,
  moveProductPhotoAction,
  removeProductPhotoAction,
  updateProductPhotoAction,
  type PhotoResult,
} from "@/lib/studio/product-photo-actions";
import type { StudioProductPhoto } from "@/lib/studio/product-photo-types";

/**
 * A product's photos, built for a phone first.
 *
 * "Upload photos" takes several at once straight from the camera roll; the
 * library grid adds ones already uploaded. The first photo is the main one —
 * it is what every card shows. Each photo can say which part must stay in
 * frame when cropped, carry a description, and belong to one choice (the
 * Blue crossbody), which the product page then shows first when that choice
 * is picked.
 *
 * Every change saves immediately and re-reads from the server, so what is
 * shown here is always what the store has.
 */

const MAX_BYTES = 25 * 1024 * 1024;

export function ProductPhotosEditor({
  productId,
  photos,
  library,
  variants,
}: {
  productId: string;
  photos: StudioProductPhoto[];
  library: MediaAsset[];
  variants: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(photos.length === 0 && library.length > 0);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onProduct = new Set(photos.filter((p) => p.variantId === null).map((p) => p.mediaAssetId));
  const images = library.filter((asset) => asset.kind === "image" && asset.publicUrl);

  function run(action: () => Promise<PhotoResult>, success?: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action().catch(() => ({
        ok: false as const,
        message: "The connection dropped. Try again.",
      }));
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      if (success) setMessage({ tone: "ok", text: success });
      router.refresh();
    });
  }

  async function upload(files: File[]) {
    setMessage(null);
    const usable = files.filter((file) => file.type.startsWith("image/") && file.size <= MAX_BYTES);
    if (usable.length < files.length) {
      setMessage({
        tone: "error",
        text: "Some files were skipped: photos only (JPEG, PNG, WebP or AVIF), up to 25 MB each.",
      });
    }
    if (usable.length === 0) return;

    const ids: string[] = [];
    setUploading({ done: 0, total: usable.length });
    for (const file of usable) {
      const form = new FormData();
      form.set("file", file);
      const result = await uploadMediaAction(form).catch(() => ({
        ok: false as const,
        message: "The upload did not go through. Check your connection.",
      }));
      if (result.ok) ids.push(result.assetId);
      else setMessage({ tone: "error", text: `${file.name}: ${result.message}` });
      setUploading({ done: ids.length, total: usable.length });
    }
    setUploading(null);
    if (ids.length > 0) {
      run(
        () => addProductPhotosAction({ productId, mediaAssetIds: ids }),
        ids.length === 1 ? "Photo added." : `${ids.length} photos added.`,
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="hairline bg-surface-raised">
        <div className="flex flex-col gap-3 border-b border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="label text-ink-subtle">
            Photos{photos.length > 0 ? ` · ${photos.length}` : ""}
          </h2>
          <p className="text-xs text-ink-subtle">The first photo is the main one, shown on every card.</p>
        </div>

        {photos.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="label text-ink-muted">No photos yet</p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-subtle">
              Until you add one, the store shows a quiet placeholder for this product.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-line">
            {photos.map((photo, index) => (
              <PhotoRow
                key={photo.id}
                photo={photo}
                index={index}
                count={photos.length}
                variants={variants}
                open={openId === photo.id}
                busy={pending}
                onToggle={() => setOpenId(openId === photo.id ? null : photo.id)}
                onMove={(direction) =>
                  run(() => moveProductPhotoAction({ productId, photoId: photo.id, direction }))
                }
                onRemove={() =>
                  run(
                    () => removeProductPhotoAction({ productId, photoId: photo.id }),
                    "Photo removed from this product. It is still in your Media Library.",
                  )
                }
                onUpdate={(patch, success) =>
                  run(() => updateProductPhotoAction({ productId, photoId: photo.id, ...patch }), success)
                }
              />
            ))}
          </ol>
        )}
      </section>

      <section className="hairline bg-surface-raised">
        <h2 className="label border-b border-line px-6 py-4 text-ink-subtle">Add photos</h2>
        <div className="space-y-5 px-6 py-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={Boolean(uploading) || pending}
              className="label inline-flex min-h-12 flex-1 items-center justify-center gap-2 border border-ink/70 px-5 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-wait disabled:opacity-60 sm:flex-none"
            >
              <UploadIcon />
              {uploading ? `Uploading ${uploading.done + 1} of ${uploading.total}…` : "Upload photos"}
            </button>
            {images.length > 0 ? (
              <button
                type="button"
                aria-expanded={showLibrary}
                onClick={() => setShowLibrary(!showLibrary)}
                className="label min-h-12 flex-1 border border-line-strong px-5 text-ink-muted transition-colors hover:border-ink hover:text-ink sm:flex-none"
              >
                {showLibrary ? "Hide library" : "Choose from library"}
              </button>
            ) : null}
            <input
              ref={fileInput}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                const files = [...(event.target.files ?? [])];
                event.target.value = "";
                if (files.length > 0) void upload(files);
              }}
            />
          </div>

          {showLibrary && images.length > 0 ? (
            <div>
              <p className="label text-ink-muted">Tap a photo to add it</p>
              <ul className="mt-3 grid max-h-96 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
                {images.map((asset) => {
                  const added = onProduct.has(asset.id);
                  return (
                    <li key={asset.id}>
                      <button
                        type="button"
                        disabled={added || pending}
                        aria-label={
                          added
                            ? `${asset.altText || asset.originalFilename || "Photo"} — already on this product`
                            : `Add ${asset.altText || asset.originalFilename || "this photo"}`
                        }
                        onClick={() =>
                          run(() => addProductPhotosAction({ productId, mediaAssetIds: [asset.id] }), "Photo added.")
                        }
                        className="relative block aspect-square w-full overflow-hidden bg-surface-inset hover:opacity-80 disabled:cursor-default disabled:opacity-40"
                      >
                        <Image src={asset.publicUrl as string} alt="" fill sizes="140px" className="object-cover" />
                        {added ? (
                          <span className="label absolute inset-x-0 bottom-0 bg-void/80 py-1 text-center text-ink">
                            Added
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <p aria-live="polite" className="min-h-5">
        {message ? (
          <span
            role={message.tone === "error" ? "alert" : undefined}
            className={`text-sm ${message.tone === "ok" ? "text-state-success" : "text-state-critical"}`}
          >
            {message.text}
          </span>
        ) : pending ? (
          <span className="label text-ink-subtle">Saving…</span>
        ) : null}
      </p>
    </div>
  );
}

function PhotoRow({
  photo,
  index,
  count,
  variants,
  open,
  busy,
  onToggle,
  onMove,
  onRemove,
  onUpdate,
}: {
  photo: StudioProductPhoto;
  index: number;
  count: number;
  variants: { id: string; title: string }[];
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onUpdate: (
    patch: { focal?: { x: number; y: number }; variantId?: string | null; alt?: string },
    success?: string,
  ) => void;
}) {
  const altId = useId();
  const showForId = useId();
  const [alt, setAlt] = useState(photo.alt);
  // Shown at once, before the save round-trips. Typing a description and then
  // tapping the photo is the natural order, and that tap is also what saves
  // the description — so the photo must never be disabled while a save is in
  // flight, or the tap is silently lost.
  const [focal, setFocal] = useState(photo.focal);

  const shownFor = photo.variantId
    ? (variants.find((v) => v.id === photo.variantId)?.title ?? "One choice")
    : "Every choice";

  function pickFocal(event: React.MouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const point = {
      x: round(clamp((event.clientX - box.left) / box.width)),
      y: round(clamp((event.clientY - box.top) / box.height)),
    };
    setFocal(point);
    onUpdate({ focal: point }, "Crop point saved.");
  }

  return (
    <li className="px-4 py-4 sm:px-6">
      {/* Phone: photo and words on one line, the controls on the next, so the
          words are never squeezed into a sliver. Wider screens: one line. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden bg-surface-inset sm:w-24">
          <Image
            src={photo.url}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
            style={{ objectPosition: `${focal.x * 100}% ${focal.y * 100}%` }}
          />
        </div>
        <div className="min-w-0 flex-1 basis-40">
          <p className="label text-ink">{index === 0 ? "Main photo" : `Photo ${index + 1}`}</p>
          <p className="mt-1 text-xs text-ink-subtle">Shown for: {shownFor}</p>
          {!photo.alt ? <p className="mt-1 text-xs text-state-warning">No description yet</p> : null}
        </div>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <IconButton label="Move earlier" disabled={busy || index === 0} onClick={() => onMove(-1)}>
            ↑
          </IconButton>
          <IconButton label="Move later" disabled={busy || index === count - 1} onClick={() => onMove(1)}>
            ↓
          </IconButton>
          <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className="label min-h-11 flex-1 border border-line-strong px-4 text-ink-muted transition-colors hover:border-ink hover:text-ink sm:flex-none"
          >
            {open ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="label text-ink-muted">Keep in frame</p>
            <button
              type="button"
              onClick={pickFocal}
              aria-label={`Set the focus point. Currently ${Math.round(focal.x * 100)}% across, ${Math.round(focal.y * 100)}% down.`}
              className="relative mt-3 block w-full cursor-crosshair overflow-hidden border border-line bg-surface-inset"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- the whole, uncropped photo is the point */}
              <img src={photo.url} alt="" className="block h-auto max-h-80 w-full object-contain" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-strong shadow-[0_0_0_2px_rgb(0_0_0/0.6)]"
                style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
              />
            </button>
            <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
              Tap the part that must never be cropped off.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor={altId} className="label block text-ink-muted">
                Describe the photo
              </label>
              <input
                id={altId}
                type="text"
                maxLength={300}
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                onBlur={() => {
                  if (alt !== photo.alt) onUpdate({ alt }, "Description saved.");
                }}
                className="mt-2 min-h-11 w-full border border-line-strong bg-transparent px-3 text-sm text-ink focus:border-ink focus:outline-none"
              />
              <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
                For example &ldquo;Black tee, front, on a hanger&rdquo;. Read aloud to people using
                screen readers.
              </p>
            </div>

            {variants.length > 1 ? (
              <div>
                <label htmlFor={showForId} className="label block text-ink-muted">
                  Shown for
                </label>
                <select
                  id={showForId}
                  value={photo.variantId ?? ""}
                  onChange={(e) => onUpdate({ variantId: e.target.value || null }, "Saved.")}
                  className="mt-2 min-h-11 w-full border border-line-strong bg-surface px-3 text-sm text-ink focus:border-ink focus:outline-none"
                >
                  <option value="">Every choice</option>
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      Only {variant.title}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
                  A photo for one choice — the blue bag — is shown first when a customer picks it.
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="label min-h-11 border border-line-strong px-4 text-ink-muted transition-colors hover:border-state-critical hover:text-state-critical"
            >
              Remove from this product
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="min-h-11 min-w-11 border border-line-strong text-ink-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line-strong"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
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

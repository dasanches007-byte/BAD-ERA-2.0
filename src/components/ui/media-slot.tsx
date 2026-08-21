import Image from "next/image";

import type { MediaSlot as MediaSlotData } from "@/lib/cms/sections";

/**
 * Renders a Media Library slot, or a polished placeholder when empty.
 *
 * Final production photography does not exist yet and arrives from the owner
 * AFTER the site is built (Master Spec §0.1). Every editorial image is
 * therefore a slot from day one: an asset id, alt text, and independent
 * desktop/mobile focal points.
 *
 * The placeholder is intentionally restrained rather than a loud "MISSING
 * IMAGE" band — development builds must still read as BAD ERA
 * (Master Spec §12). Swapping in a real asset requires no code change.
 */
export function MediaSlot({
  media,
  className,
  sizes = "100vw",
  priority = false,
  overlay = "none",
}: {
  media: MediaSlotData;
  className?: string;
  sizes?: string;
  priority?: boolean;
  overlay?: "none" | "hero" | "card";
}) {
  const overlayClass =
    overlay === "hero"
      ? "after:absolute after:inset-0 after:bg-[var(--overlay-hero)]"
      : overlay === "card"
        ? "after:absolute after:inset-0 after:bg-[var(--overlay-card)]"
        : "";

  return (
    <div
      className={`relative overflow-hidden bg-surface-inset ${overlayClass} ${className ?? ""}`}
    >
      {media.url ? (
        <Image
          src={media.url}
          alt={media.alt}
          fill
          sizes={sizes}
          priority={priority}
          // Preserve crop intent: never stretch, honour the focal point.
          className="object-cover"
          style={{
            objectPosition: `${media.focalDesktop.x * 100}% ${media.focalDesktop.y * 100}%`,
          }}
        />
      ) : (
        <Placeholder label={media.placeholderLabel} />
      )}
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div
      className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,#141312_0%,#0a0a0a_60%,#050505_100%)]"
      // Decorative: the alt text lives on the real image once inserted.
      aria-hidden="true"
    >
      {/* Anchored to a corner rather than centred: hero and campaign sections
          overlay a headline on top of this slot, and a centred label collides
          with it. */}
      <span className="label absolute bottom-4 right-5 text-ink-disabled/70">
        {label}
      </span>
    </div>
  );
}

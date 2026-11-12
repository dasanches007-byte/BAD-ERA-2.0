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
  cover = false,
  tone = "dark",
  edit,
}: {
  media: MediaSlotData;
  className?: string;
  sizes?: string;
  priority?: boolean;
  overlay?: "none" | "hero" | "card";
  /** Fill the positioned box that holds it, instead of sizing itself. */
  cover?: boolean;
  /** Which cement the slot sits on, for the placeholder shown until it is filled. */
  tone?: "dark" | "pale";
  /** Edit-target attributes, present only while an owner is editing. */
  edit?: Record<string, string>;
}) {
  const overlayClass =
    overlay === "hero"
      ? "after:absolute after:inset-0 after:bg-[var(--overlay-hero)]"
      : overlay === "card"
        ? "after:absolute after:inset-0 after:bg-[var(--overlay-card)]"
        : "";

  return (
    <div
      {...edit}
      className={`${cover ? "absolute inset-0" : "relative"} overflow-hidden ${
        tone === "pale" ? "bg-pale-card" : "bg-surface-inset"
      } ${overlayClass} ${className ?? ""}`}
    >
      {media.url ? (
        <Image
          src={media.url}
          alt={media.alt}
          fill
          sizes={sizes}
          priority={priority}
          // Preserve crop intent: never stretch, honour the focal point. Phones
          // and desktops crop independently, so each gets its own point; the
          // mobile one was stored but unused until the on-page editor shipped.
          className="object-cover [object-position:var(--focal-mobile)] md:[object-position:var(--focal-desktop)]"
          style={
            {
              "--focal-desktop": focalPosition(media.focalDesktop),
              "--focal-mobile": focalPosition(media.focalMobile ?? media.focalDesktop),
            } as React.CSSProperties
          }
        />
      ) : (
        <Placeholder label={media.placeholderLabel} tone={tone} />
      )}
    </div>
  );
}

function focalPosition(point: { x: number; y: number }): string {
  return `${point.x * 100}% ${point.y * 100}%`;
}

function Placeholder({ label, tone }: { label: string; tone: "dark" | "pale" }) {
  if (tone === "pale") {
    return (
      <div className="absolute inset-0 bg-pale-card" aria-hidden="true">
        <span className="label absolute bottom-3 right-3.5 text-pale-muted/70">{label}</span>
      </div>
    );
  }
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

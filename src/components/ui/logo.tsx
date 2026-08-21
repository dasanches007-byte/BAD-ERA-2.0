import Image from "next/image";

import monogram from "../../../public/brand/bad-era-monogram.png";

/**
 * The official BAD ERA monogram.
 *
 * LOCKED ASSET (Master Spec §0.1, §0.3). This component renders the
 * owner-supplied artwork as an image. The mark must NEVER be reconstructed with
 * web fonts, CSS, SVG paths, or by any other means; its geometry, letter
 * overlap and four-point sparkle are fixed, and its aspect ratio is preserved.
 *
 * If you are tempted to "just set the tracking on a serif font" to approximate
 * it — don't. Use this component.
 */
export function Monogram({
  size = 40,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={monogram}
      alt="BAD ERA"
      width={size}
      height={size}
      priority={priority}
      className={className}
      // Never distort. The source is square; height follows width.
      style={{ height: "auto" }}
    />
  );
}

/**
 * The wordmark lockup used in navigation.
 *
 * The words "BAD ERA" set in the display serif are a typographic treatment, not
 * the logo. The logo is the monogram above. Both appear on the approved usage
 * board; keep them distinct.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={`font-display text-[1.35rem] leading-none tracking-[0.28em] text-ink-strong ${className ?? ""}`}
    >
      BAD ERA
    </span>
  );
}

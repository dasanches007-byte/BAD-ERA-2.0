import Image, { type StaticImageData } from "next/image";

import fullLockup from "../../../public/brand/bad-era-primary-white.png";
import compactMark from "../../../public/brand/bad-secondary-white.png";

/**
 * The BAD ERA logos — owner-approved identity amendment of 5 November 2026
 * (`brand/logo/README.md`). Two marks, in a fixed hierarchy:
 *
 *   PRIMARY    `BrandMark`           the full BAD ERA lockup: oversized BAD,
 *                                    small italic ERA on its lower right
 *   SECONDARY  `SecondaryBrandMark`  BAD alone, for compact places
 *
 * LOCKED ASSETS. Both render the owner's artwork as images. Neither may be set
 * in a font, redrawn, traced, reshaped, slanted, stretched or given effects,
 * and the primary must never be imitated by typing "ERA" after the secondary.
 * The B–E monogram they replaced is retired to `brand/logo/legacy/`.
 *
 * White, for the site's dark surfaces. Black masters for light backgrounds
 * are in `brand/logo/`; the site currently has none.
 */

/**
 * Each artwork's pixel size, and where its letters start (`inkLeft`) — the
 * files carry their own clear space. `tests/unit/brand-mark.test.tsx` checks
 * these against the files.
 */
export const PRIMARY_ARTWORK = { width: 863, height: 270, inkLeft: 46 } as const;
export const SECONDARY_ARTWORK = { width: 961, height: 350, inkLeft: 56 } as const;

type Artwork = { width: number; height: number; inkLeft: number };

type MarkProps = {
  /** Rendered height in CSS pixels, clear space included. Width follows. */
  height?: number;
  /** A different height from the `lg` breakpoint up. */
  lgHeight?: number;
  /**
   * Pull the mark left by its built-in clear space, so its letters line up
   * with text beneath it. The page margin still provides the clear space.
   */
  flush?: boolean;
  className?: string;
  priority?: boolean;
};

/**
 * The PRIMARY logo: the full BAD ERA lockup.
 *
 * ERA is a fifth of BAD's height, so this needs room: below about 48px tall
 * ERA drops under ~6px and stops reading. Where there is not that much room,
 * use `SecondaryBrandMark` — never shrink this until ERA is a smudge.
 */
export function BrandMark(props: MarkProps) {
  return <Mark src={fullLockup} artwork={PRIMARY_ARTWORK} {...props} />;
}

/** The SECONDARY logo: BAD alone — icons, compact navigation, small sign-offs. */
export function SecondaryBrandMark(props: MarkProps) {
  return <Mark src={compactMark} artwork={SECONDARY_ARTWORK} {...props} />;
}

function Mark({
  src,
  artwork,
  height = 32,
  lgHeight,
  flush = false,
  className,
  priority = false,
}: MarkProps & { src: StaticImageData; artwork: Artwork }) {
  const largest = Math.max(height, lgHeight ?? height);
  return (
    <Image
      src={src}
      alt="BAD ERA"
      height={largest}
      width={Math.round((largest * artwork.width) / artwork.height)}
      priority={priority}
      // Height is set here and width always follows it: the base styles give
      // every image `height: auto` and `max-width: 100%`, which would let the
      // file's size decide the height and a narrow parent squeeze the width —
      // a squashed logo. `max-w-none` is what keeps the proportions true.
      // Heights travel as variables so the flush offset is always computed
      // from the height actually drawn.
      className={[
        "w-auto max-w-none shrink-0 h-[var(--mark-h)] lg:h-[var(--mark-h-lg)]",
        flush ? "-ml-[calc(var(--mark-h)*var(--mark-inset))] lg:-ml-[calc(var(--mark-h-lg)*var(--mark-inset))]" : "",
        className ?? "",
      ].join(" ")}
      style={
        {
          "--mark-h": `${height}px`,
          "--mark-h-lg": `${lgHeight ?? height}px`,
          "--mark-inset": String(artwork.inkLeft / artwork.height),
        } as React.CSSProperties
      }
    />
  );
}

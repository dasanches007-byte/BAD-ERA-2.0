import Image, { type StaticImageData } from "next/image";

import fullLockupBlack from "../../../public/brand/bad-era-primary-black.png";
import fullLockup from "../../../public/brand/bad-era-primary-white.png";
import compactMarkBlack from "../../../public/brand/bad-secondary-black.png";
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
 * Monochrome: white on dark, black on light (`tone`). The black files are the
 * owner's black masters, served byte for byte like the white ones. The site
 * header carries both and shows whichever suits what is under it.
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
  /** A different height from the `md` breakpoint up. */
  mdHeight?: number;
  /** A different height from the `lg` breakpoint up. */
  lgHeight?: number;
  /**
   * Pull the mark left by its built-in clear space, so its letters line up
   * with text beneath it. The page margin still provides the clear space.
   */
  flush?: boolean;
  /** White (the default) for dark surfaces, black for pale ones. */
  tone?: "white" | "black";
  /**
   * A fluid height as a CSS length, e.g. `min(28.8vw, 17rem)`, for the places
   * the logo scales with the screen. Replaces `height` at every breakpoint;
   * the width still follows, so the proportions cannot change.
   */
  fluidHeight?: string;
  /**
   * Fill the width of whatever holds it, height following: the footer's
   * signature. Proportions are the file's own, so nothing can stretch.
   */
  fullWidth?: boolean;
  /** Empty for a second copy of the mark that is hidden from assistive tech. */
  alt?: string;
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
  return (
    <Mark src={props.tone === "black" ? fullLockupBlack : fullLockup} artwork={PRIMARY_ARTWORK} {...props} />
  );
}

/** The SECONDARY logo: BAD alone — the header, icons, compact places, sign-offs. */
export function SecondaryBrandMark(props: MarkProps) {
  return (
    <Mark src={props.tone === "black" ? compactMarkBlack : compactMark} artwork={SECONDARY_ARTWORK} {...props} />
  );
}

function Mark({
  src,
  artwork,
  height = 32,
  mdHeight,
  lgHeight,
  flush = false,
  fluidHeight,
  fullWidth = false,
  alt = "BAD ERA",
  className,
  priority = false,
}: MarkProps & { src: StaticImageData; artwork: Artwork }) {
  const md = mdHeight ?? height;
  const lg = lgHeight ?? md;
  const largest = fluidHeight || fullWidth ? artwork.height : Math.max(height, md, lg);
  if (fullWidth) {
    return (
      <Image
        src={src}
        alt={alt}
        height={artwork.height}
        width={artwork.width}
        sizes="100vw"
        priority={priority}
        // Width is the holder's and height follows from the file's own ratio.
        className={`block h-auto w-full max-w-none ${className ?? ""}`}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
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
        "w-auto max-w-none shrink-0 h-[var(--mark-h)] md:h-[var(--mark-h-md)] lg:h-[var(--mark-h-lg)]",
        flush
          ? "-ml-[calc(var(--mark-h)*var(--mark-inset))] md:-ml-[calc(var(--mark-h-md)*var(--mark-inset))] lg:-ml-[calc(var(--mark-h-lg)*var(--mark-inset))]"
          : "",
        className ?? "",
      ].join(" ")}
      style={
        {
          "--mark-h": fluidHeight ?? `${height}px`,
          "--mark-h-md": fluidHeight ?? `${md}px`,
          "--mark-h-lg": fluidHeight ?? `${lg}px`,
          "--mark-inset": String(artwork.inkLeft / artwork.height),
        } as React.CSSProperties
      }
    />
  );
}

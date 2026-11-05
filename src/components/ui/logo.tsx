import Image from "next/image";

import mark from "../../../public/brand/bad-primary-white.png";

/** The artwork's size in pixels. `tests/unit/brand-mark.test.tsx` checks the file. */
export const MARK_SIZE = { width: 961, height: 350 } as const;

/**
 * The official BAD mark — the owner's primary wordmark, approved 5 November
 * 2026 (`brand/logo/BAD-official-logo-package.md`). It replaced the B–E
 * monogram, which is retired to `brand/logo/legacy/`.
 *
 * LOCKED ASSET. This renders the owner-supplied artwork as an image. The mark
 * must NEVER be set in a font, redrawn, traced, reshaped, slanted, stretched
 * or given effects — "a bold geometric sans in caps" is not the logo; this
 * file is. Its aspect ratio is fixed: give a height and the width follows.
 *
 * White, for the site's dark surfaces. The black master
 * (`brand/logo/BAD-primary-black-transparent.png`) is for light backgrounds,
 * of which the site currently has none.
 *
 * The file carries its own clear space — about a quarter of the letter height
 * on every side, as the package asks — so the letters fill roughly 70% of
 * `height`. Do not crop it to make the mark look bigger; size it instead.
 */
export function BrandMark({
  height = 32,
  className,
  priority = false,
}: {
  /** Rendered height in CSS pixels, clear space included. */
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={mark}
      alt="BAD ERA"
      height={height}
      width={Math.round((height * MARK_SIZE.width) / MARK_SIZE.height)}
      priority={priority}
      // Height is set here, and width always follows it — the base styles give
      // every image `height: auto`, which would otherwise let the file's own
      // size decide. A responsive class such as `lg:h-10` still wins on its
      // breakpoint; it can change the height, never the proportions.
      className={`h-[var(--mark-h)] w-auto ${className ?? ""}`}
      style={{ "--mark-h": `${height}px` } as React.CSSProperties}
    />
  );
}

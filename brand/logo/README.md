# BAD ERA logos

## Identity amendment — owner-approved, 5 November 2026

This amends master spec v1.9 §0.1 / §0.3, which locked the B–E serif monogram.
The owner replaced it the same day in two steps; the second is in force:

1. *(superseded)* **BAD** alone became the primary mark —
   `handoff-2026-11-05/BAD-only-package-README-superseded.md`.
2. **In force:** the full **BAD ERA** lockup is PRIMARY and **BAD** alone is
   SECONDARY — `handoff-2026-11-05/README.md` and
   `handoff-2026-11-05/CLAUDE_CODE_HANDOFF.md`.

The old documents are kept, not rewritten: the history of what was approved,
and when, is part of the record.

## The hierarchy

| | Mark | Use |
|---|---|---|
| **Primary** | Full **BAD ERA**: oversized BAD, small italic ERA on its lower right | The homepage hero, the footer's brand column, sign-in, packaging, signage — wherever ERA can still be read |
| **Secondary** | **BAD** alone | The site header, app and browser icons, Studio's nav, small sign-offs, embroidery, hardware |
| Retired | B–E monogram (`legacy/`) | Nowhere. Kept for history |

**6 November 2026, owner's placement:** BAD alone in the site header; the full
BAD ERA lockup takes the homepage hero's headline place. The hero draws the
lockup whenever its headline is the brand name (or empty); any other words
show as a headline.

Rules from the package, all locked:

- Render the artwork; never set either mark in a font, redraw, trace, reshape,
  slant, stretch, outline, shadow, gradient or recolor it.
- Never imitate the primary by typing "ERA" after the BAD-only artwork.
- Monochrome: white on dark, black on light.
- Clear space at least ¼ of BAD's letter height on every side. The PNGs carry
  it; on the site `flush` lines the letters up with text and the page margin
  keeps the space.
- ERA is a fifth of BAD's height. Below about 48 CSS px tall the full lockup's
  ERA stops reading — use the secondary there instead of shrinking it.

## Files

| Path | What it is |
|---|---|
| `primary-full-BAD-ERA/BAD-ERA-primary-white-transparent.png` | **Primary master**, 863×270 incl. clear space. Served byte-for-byte as `public/brand/bad-era-primary-white.png` |
| `primary-full-BAD-ERA/BAD-ERA-primary-black-transparent.png` | Black master, for light backgrounds. Served as `public/brand/bad-era-primary-black.png` |
| `primary-full-BAD-ERA/*-3x.png` | Enlarged convenience exports — no extra original detail |
| `secondary-BAD/BAD-secondary-white-transparent.png` | **Secondary master**, 961×350 — exactly the file first approved. Served as `public/brand/bad-secondary-white.png` |
| `secondary-BAD/BAD-secondary-black-transparent.png` | Its black counterpart |
| `secondary-BAD/BAD-secondary-white-on-black-square-ORIGINAL.png` | The owner's original BAD image; source of the 180 and 512 px icons |
| `reference/owner-approved-BAD-ERA-on-building.jpeg` | The approved treatment (top panel) and storefront signage. A reference, not site photography |
| `vector-traces-DRAFT/` | **Autotraces only.** Not for manufacturing or trademark filing |
| `handoff-2026-11-05/` | The packages' own documents and metadata |
| `legacy/` | The retired monogram and its usage board |

## Before production

The primary is a raster extracted from a JPEG presentation, not a designer's
vector. Before illuminated letters, embroidery dies, engraving, screen-print
separations or a trademark filing, have a designer draw and proof a vector
master against `reference/`. Approving a logo is a creative decision, not
trademark clearance: BAD and BAD ERA need professional clearance for the goods
they will be used on.

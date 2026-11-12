# BAD ERA surfaces

Owner-approved, 12 November 2026: the storefront is built from **cement**.

| File | What it is |
|---|---|
| `cement-owner-supplied.jpg` | The cement image the owner supplied (1024×1536). The master. Not edited. |
| `public/brand/texture/cement.webp` | The master re-encoded for the web, upright. Used on phones and tall screens. |
| `public/brand/texture/cement-wide.webp` | The same image turned on its side, for wide screens. |
| `public/brand/texture/pale.webp` | **Pale cement**: the master inverted and calmed (contrast × 0.47, lifted to a mean near `#e2e0da`, a slight warmth), 768×1152. The light surface behind products. |
| `public/brand/texture/pale-wide.webp` | Pale cement turned on its side. |

## The palette they set

Every storefront colour comes from this one material, so nothing fights it:

| Name | Value | Use |
|---|---|---|
| Cement | the texture (average `#2d2d2d`) | The statement panel, the footer, the bag and the menu |
| Pale cement | the texture (average `#e2e0da`) | Behind products, the product page |
| Bone | `#f4f1ea` | Lettering on dark |
| Black | `#0a0a0a` | Dark sections, lettering on pale |
| Steel | `#9d9a94` | Quiet lettering on dark |
| Graphite | `#55524e` | Quiet lettering on pale, prices |

There is no colour in the design. The only colour on a page is in the photography.

## Rules

- The cement is a brand surface, like the logo: it is not a photo slot and is
  not swapped from Studio. Changing it is a design change.
- Lettering on cement is bone; on pale cement it is black. Never the reverse.
- Regenerating the pale texture: invert the master, then scale contrast and
  lift (`out = 0.47 × in + 127` after inversion), then warm slightly
  (G × 0.992, B × 0.968). Keep the mean near `#e2e0da` so type contrast holds.

## Before launch

Confirm the licence of the supplied image if it came from a stock library.

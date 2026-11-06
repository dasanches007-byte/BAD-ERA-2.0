# CLAUDE CODE — Implementation Brief: Replace Primary BAD Logo with BAD ERA

**Owner decision, November 5, 2026.** This handoff supersedes the earlier 2026-11-05 decision that made **BAD-only** the primary. **The full BAD ERA wordmark is now PRIMARY; BAD-only remains SECONDARY.** This explicitly supersedes older project documentation that locked the old BE monogram, and the intermediate `BAD primary` spec. Keep all non-brand engineering/security and product requirements intact.

Repository: `dasanches007-byte/BAD-ERA-2.0`  
Current default branch when reviewed: `claude/festive-cray-354clx`

## DO THIS

1. Inspect the *current* repository and read `CLAUDE.md`, `src/components/ui/logo.tsx`, `src/components/storefront/site-header.tsx`, `src/components/storefront/site-footer.tsx`, `src/app/layout.tsx`, `brand/ASSET_MAP.md` and `tests/unit/brand-mark.test.tsx` **before editing**. The current repo ALREADY has the BAD-only logo as `BrandMark` and a 961×350 fixed-size assertion. Do not roll back to the BE monogram.
2. Add `assets/primary-full-BAD-ERA/BAD-ERA-primary-white-transparent.png` to `public/brand/bad-era-primary-white.png`, and the black variant to `public/brand/bad-era-primary-black.png`. Preserve source bytes when copying. Optionally archive copies in `brand/logo/` as the official locked masters.
3. Keep/re-use existing BAD-only asset: `public/brand/bad-primary-white.png` and its master under `brand/logo/BAD-primary-white-transparent.png` for the **secondary**. Avoid re-exporting or altering it unnecessarily. If missing, recover it from `assets/secondary-BAD/`.
4. Update `src/components/ui/logo.tsx` to expose two image-backed components: `BrandMark`/`PrimaryBrandMark` renders the FULL BAD ERA art by default; `SecondaryBrandMark` renders BAD-only. Use the actual primary PNG intrinsic dimensions from this pack (863 × 270 including clear space), not the previous `961 × 350`. Do not reconstruct it with text, fonts, SVG code, or styled HTML.
5. Update site header to prioritize full BAD ERA at a legible size on desktop. On small screens (or tight-width contexts), use the BAD-only **secondary** if ERA becomes unreadable. Preserve the site header's responsive layout, account/cart links, accessibility, and approved UI. Verify how current `height` prop interacts with intrinsic whitespace and CSS classes.
6. Update footer/brand moments to use the full primary lockup where readable. Ensure `alt="BAD ERA"` and link label `BAD ERA — home` remain sensible. Remove any extra adjacent typed 'BAD ERA' that would duplicate the wordmark. Keep semantic text where needed for screen readers, SEO or legal notices, rather than relying on a logo image alone.
7. Keep icon/favicons as the compact BAD-only secondary artwork, unless technical legibility testing suggests a different crop derived from that same artwork. The existing app icon may already be correct; avoid gratuitous changes.
8. Update `brand/ASSET_MAP.md`, `CLAUDE.md`, any logo package/readme in `brand/logo/`, and tests. Add a clearly dated **owner-approved identity amendment** instead of silently pretending old spec docs never existed. Change assertions in `tests/unit/brand-mark.test.tsx`: full BAD ERA must match the new master byte-for-byte; `BrandMark` must use image; correct intrinsic dimensions; secondary BAD master remains byte-for-byte unchanged; old BE remains retired; check hero/header/footer where used.
9. Confirm global content: stored site sections already show the text 'BAD ERA' in headings/labels; do not unnecessarily replace text with embedded logo images. Preserve accessibility and dynamic CMS functionality.
10. Run `npm run verify` (lint, typecheck, test, build). Run any relevant visual checks at 390px mobile and 1440px desktop. Confirm no clipping/stretching, full logo reads at normal header size, and old identity isn't accidentally rendered. Report changed files, screenshots, tests, and any issues. **Do not change commerce, Stripe, Supabase, inventory, policy wording, or production credentials for this brand-only request.**

## PRIORITY RULES

- **Primary = BAD ERA**, with bold BAD and smaller italic ERA aligned to BAD's lower right, as supplied.
- **Secondary = BAD only**, unchanged, for compact applications.
- Source of truth = this package's `references/` owner-approved image and PNG assets, not older BE/old BAD-primary directives.
- No redesign, no font substitute, no separate text-appended ERA recreation, no metal gradients or embellishments.
- No implied trademark clearance or manufacturing-ready vector certification.

## ACCEPTANCE CHECKLIST

- [ ] Site desktop header displays official full BAD ERA as an image, with no duplication.
- [ ] Mobile header remains functional and text/links remain accessible; use secondary only if justified by space.
- [ ] Site footer and suitable brand moments use full BAD ERA image.
- [ ] Product accessories / tiny app icons can use BAD-only secondary.
- [ ] New full artwork matches owner-approved layout (tiny italic ERA at right on BAD's baseline).
- [ ] Both colorways are available; correct image dimensions and intrinsic aspect ratio.
- [ ] No BE legacy mark in active UI.
- [ ] Brand docs + tests reflect NEW hierarchy; old brand directives marked superseded.
- [ ] `npm run verify` passes; no unrelated commerce logic touched.

## WEB READABILITY NOTE

The raster master is 862×270 including ~45px clear space. The ERA glyphs are significantly smaller than BAD. At a 36px-tall image in the website navbar, the ERA detail may render at less than ~5px letter-height and not be legible. Prefer a larger full lockup on desktop if available, and BAD-only at truly small sizes. Do not enlarge ERA independently without fresh owner approval.

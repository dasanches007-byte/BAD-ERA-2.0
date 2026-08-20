# BAD ERA — Visual asset map

Every image below was extracted from the Master Product & Engineering Specification v1.9
in document order. Classifications come from master spec §25.3.

## Classification legend

| Class | Meaning |
|---|---|
| **OFFICIAL / ACTIVE** | Owner-supplied production artwork. Use exactly. Never redraw or reinterpret. |
| **APPROVED / ACTIVE** | Structural reference. The composition, hierarchy and interaction pattern are locked; the photography inside is placeholder. |
| **OWNER PRODUCT REF** | Real product truth (colorways, variants). Not necessarily final storefront photography. |
| **APPROVED / DEFERRED** | Approved direction for a later phase. Preserve; do not ship in v1. |
| **APPROVED / REUSABLE** | Campaign/mood reference available for placeholders, collection cards or future modules. |

## Official identity — locked

| File | Class | Rule |
|---|---|---|
| `logo/bad-era-monogram-master.png` | OFFICIAL / ACTIVE | The master mark: overlapping B–E serif monogram with four-point sparkle, ivory on near-black. Exact geometry is locked. Use the source artwork — never reconstruct with web fonts or CSS. |
| `logo/bad-era-logo-usage-board.jpeg` | OFFICIAL / ACTIVE | Approved primary, inverse, favicon, wordmark lockup, small-size/embroidery applications. Supersedes all earlier generated identity boards. |

Full-resolution originals. All other files in this directory are downscaled references.

## Storefront structure

| File | Class | Locks |
|---|---|---|
| `reference/storefront/homepage-3.0-desktop.jpg` | APPROVED / ACTIVE | Layout rhythm, hierarchy, dark editorial treatment. **Superseded details:** the "NOT A SCAMMER." hero subtitle and the four-tile category row are removed from the approved final. |
| `reference/storefront/shop-all-desktop.jpg` | APPROVED / ACTIVE | Editorial header + product grid composition |
| `reference/storefront/shop-all-mobile.jpg` | APPROVED / ACTIVE | Responsive view of the same storefront — not a separate app |
| `reference/storefront/product-01-desktop.jpg` | APPROVED / ACTIVE | The shared Editorial Commerce PDP template |
| `reference/storefront/product-mobile.jpg` | APPROVED / ACTIVE | Mobile PDP. **Superseded detail:** the concept shows 2XL — invalid. Standard apparel is S/M/L/XL; Archive 01 Tee is S/M/L. |

## Studio

| File | Class | Locks |
|---|---|---|
| `reference/studio/site-editor.jpg` | APPROVED / ACTIVE | Left nav, live preview, right inspector, device preview, Draft/Preview/Publish/Version History, Media Library |
| `reference/studio/fulfillment-providers.jpg` | APPROVED / ACTIVE | Provider card grid, connection-mode badges, health states, Add Provider. All values must come from live authenticated data. |
| `reference/studio/product-inventory-fulfillment.jpg` | APPROVED / ACTIVE | Owner-facing inventory-mode selector; controls adapt per mode |
| `reference/studio/manual-supplier-action-required.jpg` | APPROVED / ACTIVE | Manual Supplier Order workspace + Action Required / failure-recovery queue |

Never flatten any of these into a clickable background image. Rebuild every field, card,
button and status as a real accessible component.

## Archive 01

| File | Class | Notes |
|---|---|---|
| `reference/archive-01/crossbody-colorways-black-red-blue.jpg` | OWNER PRODUCT REF | Actual Black / Red / Blue variant truth |
| `reference/archive-01/original-era-set.jpg` | OWNER PRODUCT REF | The composite Tee + Crossbody bundle |
| `reference/archive-01/archive-module-desktop.jpg` | APPROVED / ACTIVE | FROM THE ARCHIVE three-card editorial row |
| `reference/archive-01/archive-module-mobile.jpg` | APPROVED / ACTIVE | Stacked mobile composition |

## Deferred — preserve, do not ship in v1

| File | Class |
|---|---|
| `reference/deferred/lookbook-concept.jpg` | APPROVED / DEFERRED |
| `reference/deferred/era-00-landing-concept.jpg` | APPROVED / DEFERRED |
| `reference/deferred/be-frame-00-glim.jpg` | APPROVED / DEFERRED — future eyewear |
| `reference/deferred/quiet-luxury-inspiration.jpg` | OWNER REF — mood, silhouette, fabric and understated branding only. Do not copy the pictured garment. |

## Reusable campaign / mood

`reference/campaign/tops.jpg` · `outerwear-be-you.jpg` ·
`accessories-crossbody-detail.jpg` · `bag-lifestyle-night.jpg` ·
`brand-atmosphere-california-night.jpg`

Class: APPROVED / REUSABLE. Available for placeholders, collection cards and future
editorial modules. Preserving these does **not** re-add the removed homepage category row.

## Excluded

Earlier generated BAD ERA logo-system and luxury-identity boards are **SUPERSEDED /
EXCLUDED**. They were not extracted into this repository and must never be used, traced,
reconstructed or treated as authoritative. The owner-supplied monogram master and usage
board above are the only identity authority.

---

**Global rule:** every image here is direction, not production photography. Final imagery is
supplied by the owner later and must be swappable through Studio with no code change.

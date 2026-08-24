# Storefront screenshots — Phase 10 QA

Captured 2026-08-24 from a production build (`next build` + `next start`) at
1440×900 desktop and 390×844 mobile, 2× device scale.

## Read these correctly

Two things in these images look like defects and are not:

**The dark rectangles are empty photography slots.** Every image on the site is
a `MediaSlot` awaiting the owner's production photography — the slot label is
visible in each corner (`HOME HERO`, `ERA CAMPAIGN`, `STORY 01`…). Uploading in
Studio → Media fills them with zero code changes, which is the point of the
slot model.

**No products appear.** The sandbox these were captured in cannot reach the
Supabase project (outbound CONNECT to `snkvgpfpnphvbkiafptd.supabase.co`
returns 403). The catalog read therefore fails and `safeCatalogRead` degrades
the product surfaces to nothing rather than blanking the page. On a environment
with database access those sections populate. This is the documented behaviour
for OPTIONAL product surfaces only — cart, checkout and order reads fail loudly
instead.

So these show **layout, typography, spacing and copy**, not the finished site.

## What each one is for

| File | Shows |
|---|---|
| `01-home` | Approved Homepage 3.0 structure: hero → trust strip → ERA campaign → editorial story row → footer. "ERA 00" renders with lining figures, not "ERA oo" |
| `02-shop` | Shop All, in its catalog-unreachable empty state |
| `03-cart-empty` | Empty cart state |
| `04-support` | Public support entry (built in Phase 10) |
| `05-about-unpublished` | The honest "not published yet" state every policy page shows until the owner writes it in Studio. No placeholder legal text, by design |
| `06-checkout-success` | Post-payment landing in its "being confirmed" state, before the verified webhook lands. It never asserts payment |
| `07-checkout-cancelled` | Stripe cancel landing. Changes no state |
| `08-sign-in` | Owner / customer sign-in |
| `09-not-found` | 404, served through the dynamic catch-all so it carries a CSP nonce |

Not captured: Studio. It requires a signed-in owner session, which needs
database access.

Reference boards for comparison live in `brand/reference/` — see
`brand/ASSET_MAP.md`.

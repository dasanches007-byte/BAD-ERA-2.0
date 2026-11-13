# BAD ERA on Shopify: the cement design on Horizon

The owner's Shopify store (`urbadera.myshopify.com`, Basic plan) is the starter
store for made-to-order clothing: most fulfillment companies only connect to
Shopify, so it sells pieces BAD ERA holds no stock of until there is profit to
buy in bulk (owner's decision, 13 November 2026). badera.world and Studio stay
built and saved for that later stage.

This folder is the theme work for that store: Shopify's **Horizon 4.5.0**,
restyled in the cement design. Only the files that differ from stock Horizon
are kept here, in `theme/`, at the paths they have in the theme.

## Where it goes

- **Theme:** the store's unpublished `Horizon` theme
  (`gid://shopify/OnlineStoreTheme/190577082451`). The live theme is `Drive`.
  Shopify lets an app edit only unpublished themes, and never publish one:
  the owner previews it and presses **Publish** (Online Store → Themes).
- **Images**, already in the store's Files (uploaded 13 Nov 2026 from
  badera.world): `bad-era-primary-white.png`, `bad-era-primary-black.png`,
  `bad-secondary-white.png`, `bad-secondary-black.png`, `bad-era-icon.png`,
  `bad-era-cement.webp`, `bad-era-cement-wide.webp`, `bad-era-pale.webp`,
  `bad-era-pale-wide.webp`. The theme reads them as `shopify://shop_images/…`
  and `images['…']`, so the owner can replace them in Files with no code.
- **Font:** `assets/archivo-variable-latin.woff2`, Archivo with its width axis
  (OFL), uploaded to the theme from Google Fonts by URL:
  `https://fonts.gstatic.com/s/archivo/v25/k3kQo8UDI-1M0wlSfdnoLmvDIaI.woff2`.
- **Collection:** `Shop all` (`shop-all`), a smart collection of every product
  with a price. The home page's buttons and product row point at it, so the
  row never shows Horizon's placeholder "Product title" cards to customers
  once there are products.

## What changed

| File | Change |
|---|---|
| `assets/bad-era.css` | New. Poster voice on every heading preset (condensed Archivo, 800, capitals), tracked small capitals for menu and labels, pill lettering and the 1.5px outline |
| `snippets/bad-era-styles.liquid` | New. Loads the font and exposes the cement textures from Files as CSS variables, then the stylesheet |
| `layout/theme.liquid` | Two lines: renders `bad-era-styles` last in `<head>`, so its overrides win |
| `config/settings_data.json` | Palette near-black / bone / steel / hairline; BAD logo (white, black inverse); favicon; uppercase headings; pill buttons, variants and badges; square cards and inputs. The `Horizon` preset is kept untouched |
| `sections/header-group.json` | Announcement "Limited drops. Quality over quantity."; uppercase menu; no country/language pickers; header transparent over the home hero |
| `sections/footer-group.json` | Cement footer with the stitched seam (section Custom CSS), the site's newsletter wording, the full BAD ERA lockup across the width; social links EMPTY (the owner's to give), no "Powered by Shopify" |
| `templates/index.json` | Hero (cement, the BAD ERA lockup as an image, Shop now, stitched seam) → pale statement slab "Dress like you run it." with Shop the collection → Featured drops, three across on a computer and one per row on a phone |

The wording is the site's approved wording. "Fast & reliable shipping" was
left out on purpose: made-to-order pieces take days to produce, so it would be
a promise the store cannot keep.

## The rules it keeps

The logos are images, never typeset. No colour in the design. Everything the
owner writes or photographs stays editable in Shopify's own theme editor.

## Status (13 November 2026)

Built and checked with Shopify's Theme Check (`@shopify/theme-check-node`
4.0.0): no offenses in these files (stock Horizon's own 7 remain). Uploading
was interrupted when the Shopify connection dropped: the first batch (font,
`bad-era.css`, `bad-era-styles.liquid`) may or may not have landed, which is
harmless because nothing references them until `layout/theme.liquid` is
uploaded. **To finish:** upload `theme/assets`, `theme/snippets`, then the
rest, with `themeFilesUpsert` (or Shopify CLI `shopify theme push
--theme 190577082451 --only …`), then preview. The storefront is password
protected, so a preview needs the store password or the owner's own look.

**Also approved by the owner (13 November 2026), not yet done:** delete the
empty leftover collection "Women's Casual Wear example products"
(`gid://shopify/Collection/510993530963`, from Shopify's sample products,
which are already deleted). Look it up first and confirm it is still empty.

## Tools

`tools/` regenerates the JSON and checks every setting against Horizon's
schemas. They expect a Horizon 4.5.0 checkout at `$HORIZON`
(`git clone --depth 1 https://github.com/Shopify/horizon`):

```sh
cd shopify/horizon-bad-era/theme
python3 ../tools/build.py          # settings_data, header and footer groups
python3 ../tools/build_index.py    # the home page
python3 ../tools/validate.py sections/header-group.json sections/footer-group.json templates/index.json
```

`build.py` writes the store's original settings in as the `Horizon` preset;
if the store's settings change in the theme editor, fetch the live
`config/settings_data.json` first and carry those changes over.

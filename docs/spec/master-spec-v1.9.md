
# BAD ERAMASTER PRODUCT &ENGINEERING SPECIFICATION
STOREFRONT + BAD ERA STUDIO  /  VERSION 1.9
Implementation source of truth for Claude Code. This document consolidates the approved product, visual, commerce, content-management, fulfillment, customer, and publishing decisions into one build contract.
CRITICAL BUILD RULE: Final production photography will be added by the owner AFTER the website structure and systems are finished. Use replaceable placeholder/reference imagery during implementation. Do not bake mockup imagery into component code, CSS backgrounds, or layout assumptions.

# 0. CLAUDE OPERATING DIRECTIVE
CURRENT SOURCE OF TRUTH: Version 1.9. This revision supersedes v1.7 and adds the approved Manual Supplier Order and Action Required / Failure Recovery UI and behavior contract.
Treat this document as the primary implementation contract. Build the system in controlled phases. Do not silently redesign the product, simplify away approved workflows, or invent new public-facing features because they are easier to code.

## 0.1 Locked requirements
OFFICIAL LOGO LOCK — The BAD ERA logo system supplied by the owner is FINAL and LOCKED. The master mark is the exact overlapping B–E serif monogram with the four-point sparkle shown in the official artwork. Claude must use the supplied logo asset rather than redraw, trace, reinterpret, regenerate, substitute, stretch, recolor, re-space, or alter its geometry. The prior rejected logo board is obsolete and must never be used.
BAD ERA is a premium dark luxury/streetwear commerce brand. The website must feel editorial, cinematic, restrained, expensive, and intentionally minimal—not like a generic Shopify theme or SaaS dashboard.
OFFICIAL LOGO SYSTEM IS LOCKED. Use only the owner-supplied BAD ERA logo artwork: the exact overlapping B–E serif monogram with four-point sparkle, plus the approved variants shown on the official logo usage board. Never reconstruct the mark with web fonts or CSS. Logo slots may remain technically replaceable in Studio, but the default/production identity must use the supplied official asset without visual modification.
The public storefront and BAD ERA STUDIO are separate experiences. STUDIO is owner/admin software; customers never see editor controls.
All public page content that is intended to change—images, copy, links, product selections, ordering, visibility—must come from structured data editable in STUDIO.
Editing text must preserve the component’s approved font family, type scale, line-height, letter spacing, alignment rules, and responsive behavior. The editor changes content, not arbitrary design tokens.
Final user photography is intentionally deferred. Build image slots, crops, focal-position controls, alt text, preview, and replacement workflows so images can be inserted later without code changes.
Product sizes for the initial apparel system are S, M, L, XL. Do not introduce 2XL unless the owner later adds it as a variant.
Stripe is the payment authority. A client-side success page never marks an order paid. Verified, idempotent Stripe webhooks drive payment truth.
Initial shipping uses flat-rate shipping and Pirate Ship/manual fulfillment. Do not block v1 on a carrier-rating API or Rollo printer integration.
Lookbook and ERA 00 editorial collection landing concepts are approved future modules but are NOT required to block v1 launch.
Generated concept imagery is visual direction, not canonical production photography and not a license to invent products or copy another brand’s protected design.

## 0.2 Implementation discretion
Exact React component decomposition
Internal hooks/utilities
Indexing and query optimization
Caching/revalidation implementation
Testing folder structure
Naming of non-public helper modules
Choice of mature small libraries where they do not alter the product contract

## 0.3 OFFICIAL BAD ERA LOGO SYSTEM — LOCKED
AUTHORITATIVE BRAND ASSET: The two owner-supplied images below supersede every earlier generated logo/identity concept. The standalone monogram artwork is the master logo. The usage board defines approved applications/variants. If any visual reference elsewhere in this blueprint conflicts with these assets, these official logo assets win.
MASTER MARK — Exact official BAD ERA B–E monogram + four-point sparkle. Geometry is locked.
[IMAGE x1]
OFFICIAL MASTER MARK — Owner-supplied artwork. Exact geometry and sparkle placement are locked; use the supplied asset rather than reconstructing the mark.
OFFICIAL LOGO USAGE BOARD — Approved primary, inverse, favicon, wordmark lockup, small-size/embroidery and premium application direction.
[IMAGE x1]
OFFICIAL LOGO USAGE BOARD — Owner-supplied identity reference. This board and the master mark above supersede all earlier generated logo/identity concepts.
NON-NEGOTIABLE USAGE RULES: (1) use source artwork, not typed approximations; (2) preserve aspect ratio and clear space; (3) do not distort/stretch; (4) do not remove/reposition the sparkle; (5) do not alter letter overlap/geometry; (6) use inverse artwork on light backgrounds; (7) use the approved favicon/icon asset for small UI contexts; (8) embroidery/hardware applications must follow the supplied simplified/production-ready variant rather than inventing a new mark.

# 1. PRODUCT VISION & EXPERIENCE PRINCIPLES

| Brand feeling | Dark luxury; California night; hidden/exclusive; fashion editorial; confident restraint; high contrast; cinematic negative space. |
| Commerce feeling | Fast and obvious when shopping, but never visually loud. Product discovery should feel like browsing a campaign, not a discount catalog. |
| Studio feeling | Elegant private control room. Calm, sparse, high-confidence admin experience; not an enterprise spreadsheet wall. |
| Responsive principle | One design system across desktop/mobile. Mobile is intentionally composed, not a squeezed desktop layout. |
| Content principle | Layout is designed; content is editable. Editors replace content within guardrails rather than freely breaking typography/layout. |
| Image principle | Photography is first-class and replaceable. Preserve crop/focal intent per breakpoint. |


## 1.1 Visual tokens
Backgrounds: near-black / charcoal with subtle warm-black variation
Text: bone/ivory/soft white; secondary gray; no bright dashboard blues
Accent: restrained metallic/silver/stone; color should primarily come from photography/products
Borders: hairline, low-contrast, deliberate
Headlines: elegant editorial serif / high-fashion display treatment consistent with approved concepts
Utility labels/navigation: small uppercase sans-serif with generous tracking
Motion: slow/controlled fades, image reveals, subtle hover shifts; never bouncy/gamified
Spacing: generous cinematic rhythm; sections should breathe

# 2. V1 INFORMATION ARCHITECTURE

## 2.1 Public routes
/                         Home/shop                     Shop All/products/[slug]          Product detail/cart                      Cart (page or drawer + canonical route)/checkout                  Redirect/create Stripe Checkout Session/account                   Customer account home/account/orders            Order history/account/orders/[id]       Order detail / tracking/account/profile           Profile/account/addresses         Saved addresses/support                   Support entry/contact/returns                   Returns/refunds information + request entry/about                     Brand/about/privacy                   Privacy/terms                     Terms/shipping                  Shipping information/returns-policy            Returns/refund policy

## 2.2 Studio routes
/studio                    Dashboard/studio/site               Site Editor/studio/site/[page]        Page-specific editor/studio/products           Products/studio/products/[id]      Product editor/studio/inventory          Inventory/studio/orders             Orders/studio/orders/[id]        Order workspace/studio/customers          Customers/studio/customers/[id]     Customer detail/studio/fulfillment        Fulfillment queue/studio/returns            Returns/refunds/studio/support            Support cases/studio/media              Media library/studio/publishing         Publishing/version history/studio/settings           Store/settings/integrations

## 2.3 Deferred routes/modules
/lookbook — approved future editorial experience
/era/[slug] or /collections/era-00 editorial landing — future
Automatic Rollo Wireless printing — future
Advanced multi-employee role system — future; v1 owner-first
Live carrier-rate API — future unless owner changes flat-rate decision

# 3. HOMEPAGE — APPROVED STRUCTURE
Use the approved homepage concepts as visual direction. The owner will replace imagery later. Preserve the hierarchy and editorial rhythm rather than pixel-copying placeholder photographs.
Homepage direction reference: hero, trust strip, ERA campaign block, featured products, editorial storytelling, footer.
[IMAGE x1]
APPROVED HOMEPAGE 3.0 STRUCTURAL REFERENCE — Lock layout rhythm, hierarchy and dark editorial treatment. Photography/product imagery remains replaceable through BAD ERA Studio.

## 3.1 Desktop composition
Global black header: official BAD ERA logo/brand slot at left using the supplied locked artwork; SHOP, LOOKBOOK (may remain hidden until enabled), ERA 00/collection entry (may remain hidden until enabled), ABOUT; search/account/cart utilities at right.
Hero: full-width cinematic image with large BAD ERA title and a single primary SHOP NOW action. No “Not a Scammer” hero subtitle.
Trust/utility strip: compact items such as California origin, limited drops/quality-over-quantity, secure checkout/reliable shipping. Content editable in Studio.
ERA campaign feature: large editorial image + ERA 00 / THE FIRST CHAPTER language and optional CTA. For v1 this block may link to Shop All or be disabled until the dedicated ERA page is enabled.
Featured Drops: curated product cards controlled from Studio, not hard-coded.
Editorial story row: three large visual story tiles (e.g., Blessed / Be You / Details Matter) with restrained text overlays.
Footer: BAD ERA statement, Shop links, Info links, newsletter signup, social links, official locked BAD ERA logo/brand asset and legal line.
REMOVED FROM FINAL HOMEPAGE: the four-tile category row (Tops / Outerwear / Accessories / Lookbook). The approved revision removes that row and uses the space for stronger imagery/editorial composition.

## 3.2 Hero image behavior
Desktop uses wide cinematic crop; mobile uses independent focal/crop data.
Studio image field stores media asset ID + desktop focal X/Y + mobile focal X/Y + optional per-breakpoint asset override.
Text overlay remains readable with controlled gradient/overlay token; editor cannot freely change contrast styling.
Use optimized Next.js image delivery; never stretch images; preserve aspect/crop with object-fit: cover.

# 4. SHOP ALL
Desktop Shop All visual direction.
[IMAGE x1]
APPROVED SHOP ALL — DESKTOP. Structural/layout reference; product and campaign imagery is placeholder/reference unless separately designated final.
Mobile Shop All visual direction.
[IMAGE x1]
APPROVED SHOP ALL — MOBILE. Responsive view of the same Next.js storefront; not a separate native app.

## 4.1 Requirements
Editorial header/hero area that still feels BAD ERA, followed by product grid.
Product cards: primary image, optional hover/secondary image on pointer devices, product name, price, availability state.
Grid should support apparel, accessories, future eyewear and other product types without redesign.
Filtering should remain minimal: category/type, availability, size where applicable; sorting: featured/newest/price. Do not overwhelm with marketplace controls.
Products can be featured, hidden, archived, scheduled, or sold out.
Studio controls product order/featured status and collection/category assignment.
Mobile cards prioritize image scale and touch targets; no hover-dependent information.
No final product imagery is required during build. Seed with clearly marked placeholders/reference assets and make replacement immediate through Studio.

# 5. PRODUCT DETAIL PAGE — EDITORIAL COMMERCE
Approved product-page direction reference.
[IMAGE x1]
APPROVED PRODUCT 01 — EDITORIAL COMMERCE / DESKTOP. Use the shared product template and structured commerce data; imagery remains Studio-replaceable.
[IMAGE x1]
APPROVED PRODUCT PAGE — MOBILE LAYOUT REFERENCE. IMPORTANT: the concept image may display 2XL; that visual label is superseded and must NOT control production sizing. Standard apparel follows configured variants; Archive 01 Tee is S / M / L only.

## 5.1 Core layout
Desktop: image gallery and product purchasing information composed as a premium editorial layout; mobile stacks imagery and purchase controls naturally.
Product title, price, short descriptor, variant/size selection, stock state, quantity where appropriate, Add to Cart / checkout path.
Initial apparel sizes: S / M / L / XL only.
Size button must reflect variant availability; sold-out variant is disabled but still legible.
Product gallery supports multiple images, ordering, alt text, crop/focal metadata and optional video later.
Expandable/accordion content: Details, Fit/Size, Materials/Care, Shipping & Returns.
Related/You May Also Like products are curated or rule-based but must remain visually restrained.
Sticky mobile add-to-cart may be used if it matches the approved visual language and does not cover content.

## 5.2 Product types

| STOCKED | BAD ERA owns inventory; Studio inventory is authoritative; fulfillment enters Pirate Ship/manual queue. |
| ON_DEMAND | External/on-demand supplier fulfills; store still presents a unified BAD ERA experience. Provider metadata is private. |
| PREORDER | Order is accepted against a defined preorder state/window; customer-facing estimated timing must be explicit. |


# 6. CART, CHECKOUT & STRIPE

## 6.1 Cart
Persistent server-compatible cart ID; anonymous carts supported; merge safely on sign-in where appropriate.
Line item stores product/variant ID, quantity and server-derived price snapshot; never trust client price.
Validate active product, variant, price and stock before creating checkout.
Show subtotal, flat-rate shipping policy summary, taxes calculated/handled according to configured Stripe/tax strategy, and clear total context.

## 6.2 Shipping information gate
Customer cannot proceed without a syntactically complete shipping address. Use address autocomplete/validation where practical, but do not falsely guarantee deliverability. Required: recipient name, address line 1, city, state/region, postal code, country; phone optional/configurable. Preserve apartment/unit line.

## 6.3 Stripe payment truth
Cart validated server-side  -> Create pending order / checkout intent  -> Create Stripe Checkout Session  -> Customer pays on Stripe  -> Stripe sends webhook  -> Verify signature  -> Idempotently process event  -> Mark payment/order paid only from verified event  -> Reserve/decrement inventory transactionally  -> Send confirmation  -> Order appears in fulfillment queue
Store Stripe checkout/session ID, payment intent ID and customer ID when available.
Webhook event IDs must be persisted/guarded for idempotency.
Handle checkout.session.completed, payment failure/expiration, refunds and disputes as relevant.
Success page may poll/read server order state and show “processing confirmation” until webhook truth arrives.
Never expose Stripe secret keys client-side.

# 7. CUSTOMER ACCOUNTS & ORDER EXPERIENCE
Account creation/sign-in should be optional until needed; guest checkout may be supported if compatible with desired Stripe flow, while orders can later be associated to a verified email account.
Account home: concise welcome, latest order, order status, saved addresses and support entry.
Order history: order number, date, total, fulfillment status, tracking state.
Order detail: items, variant/size, price, shipping address snapshot, payment status, fulfillment/tracking, support/return action where eligible.
Customers cannot edit an order’s shipping address after fulfillment begins; Studio may provide controlled admin correction before fulfillment.
Do not expose internal provider, margin, cost, supplier, audit, or Studio notes to customers.

## 7.1 Order state machine
PENDING_PAYMENT -> PAID -> UNFULFILLED -> IN_PROGRESS -> FULFILLEDAdditional: CANCELED | PARTIALLY_FULFILLED | REFUNDED | PARTIALLY_REFUNDED
Use separate payment_status, fulfillment_status, return_status and refund_status fields rather than one overloaded status string.

# 8. SHIPPING & FULFILLMENT — PIRATE SHIP V1
V1 deliberately avoids a carrier-rate API. Checkout charges a configured flat shipping rate. After payment, the owner fulfills stocked orders through Pirate Ship using the verified shipping address collected at checkout.

## 8.1 Studio fulfillment queue
Queue paid/unfulfilled stocked orders.
Display order number, customer, items/variants/quantities, shipping address, paid date and internal fulfillment notes.
Actions: Mark In Progress, copy/export shipping address/order data, add tracking, mark fulfilled, partially fulfill, cancel unfulfilled items where allowed.
Support CSV/export workflow if useful for Pirate Ship batch labels. Do not pretend an API exists when v1 is manual.
When tracking is entered, persist carrier + tracking number + tracking URL if known, mark fulfillment, and trigger customer shipping email.
Flat shipping amount must be configurable in Studio settings without code deployment.

## 8.2 Future Rollo
Rollo Wireless label printing is a deferred enhancement. Keep fulfillment data structured so a future print/label service can be added without changing order schema. Do not implement or block v1 on Rollo connectivity.

# 9. RETURNS, REFUNDS & SUPPORT

## 9.1 Return flow
REQUESTED -> REVIEW -> APPROVED -> RECEIVED -> REFUNDEDAlternate terminal states: REJECTED | CANCELED | CLOSED
Return eligibility must be policy-driven/configurable (window, final-sale products, condition requirements).
Customer submits order/item/reason and optional note.
Studio shows case, order/payment context and timeline.
Approval does not automatically mean refund; receipt/inspection can be a separate step.
Refund is executed through Stripe server-side; record Stripe refund ID, amount, reason, actor and timestamp.
Support partial refunds and partial returns at line-item/quantity level.
Inventory restock is an explicit Studio decision after receipt; do not automatically restock every refund.

## 9.2 Support cases
Owner-first case management: Open, Waiting on Customer, In Progress, Resolved, Closed.
Case can link to customer/order/return.
Internal notes are never customer-visible; customer messages are separate records.
Email notifications via Resend; store send status/errors.
Because the owner is initially the only Studio operator, do not overbuild teams/SLAs/agent routing in v1.

# 10. BAD ERA STUDIO — OWNER CONTROL SYSTEM
BAD ERA STUDIO is not merely a CMS form collection. It is the private operating system for the storefront. It should visually inherit BAD ERA’s elegance while prioritizing clarity and safety.

## 10.1 Dashboard
[IMAGE x1]
APPROVED BAD ERA STUDIO VISUAL EDITOR REFERENCE — Left navigation, live page preview, right contextual inspector, device preview, Draft / Preview / Publish / Version History and Media Library behavior. Rebuild as live Next.js components; never use this screenshot as the actual editor UI.
Today/period revenue summary from paid orders
Orders needing fulfillment
Low/out-of-stock variants
Recent orders
Returns/support requiring attention
Draft/unpublished site changes
Recent publish/version activity
Integration health indicators for Stripe/Resend/Supabase; Pirate Ship remains manual

## 10.2 Global Studio shell
Dark restrained left navigation or adaptive desktop rail; compact mobile drawer if Studio is used on mobile.
Top bar: current environment, preview/live state, save status, preview, publish.
No excessive gradients, neon colors, giant metric cards or generic admin-template styling.
Destructive actions require confirmation and meaningful context.

## 10.3 STUDIO IMPLEMENTATION BLUEPRINT — SHOPIFY-INSPIRED OWNER WORKFLOW
BAD ERA Studio must feel simpler and more elegant than a generic commerce admin while preserving the operational strengths associated with Shopify-style product, variant, inventory, order, fulfillment, refund, and publishing workflows. This is a custom BAD ERA system built in Next.js/Supabase/Stripe; it does not depend on Shopify and should not copy Shopify UI pixel-for-pixel.

### 10.3.1 Studio shell and navigation
Desktop shell: persistent left navigation, center workspace, contextual top bar. Mobile/tablet Studio may collapse navigation into a drawer but must remain usable.
Primary modules: Home, Site Editor, Products, Inventory, Orders, Customers, Fulfillment, Returns, Support, Media, Publishing, Settings.
Top bar always communicates current environment and state: Draft / Preview / Live, save state, Preview action, Publish action where relevant.
Global command/search may locate products, orders, customers, pages, media, and settings without exposing customer data to unauthenticated users.
Every module uses BAD ERA design tokens: near-black surfaces, ivory text, hairline borders, restrained serif headings, compact sans-serif utility text.

### 10.3.2 Product editor screen contract

| Header | Product name, status badge, Save, Preview, More actions. Never require a separate code deployment for ordinary product edits. |
| Media | Ordered gallery with upload/select, drag reorder, alt text, focal point, variant association, archive/delete safeguards. |
| Product information | Name, slug, short description, long story/details, product type, category/collection, tags/internal labels. |
| Pricing | Base price, optional compare-at price, cost per item private to Studio, tax behavior/configuration. |
| Variants | Option groups and variant matrix. Archive Tee is S/M/L; Archive Crossbody is Black/Red/Blue. |
| Inventory | Track quantity, current available quantity, continue-selling policy, low-stock threshold, SKU/barcode, adjustment history. |
| Shipping | Physical-product flag, weight/dimensions where used, fulfillment type/provider, shipping/return flags. |
| SEO | Title, meta description, social image with fallbacks. |
| Status | Draft / Active / Archived with optional scheduling later. |

The editor must save structured product data. It must not create a new page component for every product. Product pages render from the shared Editorial Commerce template.

### 10.3.3 Variant editor contract
Each sellable variant has stable variant_id, product_id, option values, SKU, price override if any, inventory policy, and fulfillment metadata.
Changing display labels must not change stable IDs or break existing order history.
Variant deletion is blocked or converted to archive when historical orders reference it.
Bulk editing is allowed for price, inventory policy, SKU, availability, weight, and other safe fields.
Variant-specific media can switch automatically on storefront selection.

### 10.3.4 Inventory screen — owner experience
Inventory is a first-class Studio module, not merely a number inside the product form. The owner should be able to see and adjust stock across the store in one calm table, similar in operational purpose to Shopify inventory management.

| Default location | BAD ERA STOCK. V1 may operate as a single physical location while the schema supports future additional locations/providers. |
| Columns | Product, variant, SKU, Available, Low-stock threshold, Continue selling?, Fulfillment type, Status. |
| Quick adjustment | +/- quantity with reason; show resulting quantity before confirmation. |
| Set quantity | Explicit absolute quantity entry for physical recounts; still creates an adjustment record. |
| Bulk edit | Select multiple variants and adjust safe inventory settings without visiting each PDP editor. |
| History | Per variant timeline: date/time, activity/reason, actor/system, delta, previous quantity, resulting quantity, related order/return if applicable. |

Required inventory adjustment reasons:
Stock recount
Found stock
Damaged
Lost
Return restock
Manual correction
Order correction
Other

### 10.3.5 Orders workspace

| Order list | Order number, customer, paid status, fulfillment status, total, date, risk/attention indicator only if real logic exists. |
| Order detail | Immutable order snapshot, line items/variants, payment records, shipping address, fulfillment(s), tracking, refunds/returns, customer communications, audit timeline. |
| Primary actions | Start fulfillment, add tracking, mark fulfilled, partial fulfill, cancel eligible unfulfilled items, refund, open return/support case. |
| Safety | Actions validate server-side order/payment/fulfillment state. UI availability alone is never authorization. |

Order status must remain decomposed: payment_status, fulfillment_status, return_status, and refund_status. Do not collapse all operational truth into one badge.

### 10.3.6 Fulfillment workspace — Shopify-like practical flow
Paid + unfulfilled stocked orders enter the fulfillment queue automatically.
Owner can mark order In Progress, copy/export validated address data to Pirate Ship, purchase postage externally, then return to Studio.
Studio accepts carrier + tracking number + optional tracking URL. Marking fulfilled creates shipment/fulfillment records and sends shipping notification.
Partial fulfillment creates fulfillment_items so remaining items stay unfulfilled.
Do not mark paid orders fulfilled merely because a label was printed externally.

### 10.3.7 Refunds and returns workspace
Refund UI loads the original paid order and allows full or partial amount/item selection within server-calculated limits.
Stripe refund is initiated server-side. Local refund state becomes successful only after Stripe confirms the refund request/event.
Restock is an independent explicit choice at item/quantity level.
For bundles, refund/return records preserve component lines so tee and bag can be handled separately.
Studio timeline records who initiated the refund, amount, reason, Stripe refund ID, restock decision, and timestamps.

### 10.3.8 Customer editor
Customer profile: contact data, saved addresses, order history, returns/support cases, internal notes where appropriate.
Customer-facing identity is never silently overwritten from an order snapshot; historical orders retain their original address/contact snapshot.
Studio never exposes Stripe secrets/full card data; only safe provider references/statuses.

### 10.3.9 Studio Settings

| Store | Brand/store name, support email, legal/business display fields. |
| Shipping | Flat shipping price, free-shipping policy if enabled later, fulfillment defaults. |
| Inventory | Global low-stock messaging thresholds; default continue-selling policy; default location. |
| Payments | Stripe connection/health indicators; webhook status; never display secret key. |
| Email | Resend sender identity/domain status and notification toggles. |
| Publishing | Preview/live environment, publish safeguards, revision retention policy. |
| Media | Storage usage and allowed image types/limits. |


### 10.3.10 Studio permission model
V1 is owner-first. Do not overbuild enterprise roles. Still implement authorization around a Studio user/role abstraction so additional staff roles can be introduced later without rewriting every mutation.
OWNER: full access.
Future roles may include Content, Fulfillment, Support, but they are deferred until explicitly enabled.
Every Studio mutation verifies authenticated Studio authorization server-side.

## 10.4 APPROVED FULFILLMENT PROVIDERS + PRODUCT FULFILLMENT UI — V1.9 LOCK
The following Studio interface is the approved visual and interaction direction for the zero-inventory / multi-provider system. Claude must preserve the hierarchy, calm editorial density, owner-friendly language, and workflow intent. The mockup is a visual specification, not a flattened production screen: all cards, metrics, product/provider data, statuses, and controls must be live components backed by the v1.7 fulfillment domain.

### 10.4.1 Official visual — Fulfillment → Providers
[IMAGE x1]
APPROVED UI REFERENCE — Fulfillment → Providers. Live provider counts, sync state and performance values must come from authenticated data; illustrative values shown in the concept are not seed truth.
APPROVED UI REFERENCE — BAD ERA Studio / Fulfillment → Providers. Provider logos shown are interface examples; live provider records and final assets are data-driven.

### 10.4.2 Route and navigation contract

| Primary route | /studio/fulfillment/providers |
| Parent area | Fulfillment |
| Fulfillment sub-navigation | Overview; Ready to Ship; Supplier Orders; Providers; Action Required; Shipments; History. |
| Global navigation relationship | Orders, Products, Customers, Inventory, Content/Site Editor, Settings remain separate top-level Studio concerns. |
| Selection behavior | Providers is visibly selected while the parent Fulfillment group remains expanded. |


### 10.4.3 Providers screen — component contract
Page header: title “Providers”, one-sentence operational description, provider search, optional filter control, and primary “Add Provider” action.
Provider cards: provider identity, connection mode badge, health/state, assigned product count, assigned variant count, last synchronization or fulfillment mode summary, and one “View Details” action.
Native BAD ERA STOCK provider appears as INTERNAL, not as an external API integration.
Manual providers appear clearly as MANUAL and do not display fake synchronization timestamps.
API providers may display last successful sync, connection status, and action-required state.
Add Provider card/empty-state is allowed at the end of the grid and performs the same action as the header button.
Provider performance summary may show useful real metrics only when backed by sufficient real data. Do not seed fake production metrics after launch.

### 10.4.4 Provider card status rules

| CONNECTED | Automated provider is configured and health checks/events indicate normal operation. |
| MANUAL / ACTIVE | Manual supplier is enabled for new fulfillment tasks; API/sync language is hidden. |
| DEGRADED | Provider can still operate but a sync/webhook/credential or repeated request issue requires attention. |
| ACTION REQUIRED | Open paid fulfillment cannot progress automatically and requires owner intervention. |
| DISABLED | No new fulfillment may route to this provider; historical orders remain readable. |
| SAMPLE TESTING / LIVE MANUAL / LIVE AUTOMATED | Activation stage remains available on Provider Details even if the grid uses a simplified public owner-facing status badge. |


### 10.4.5 Add Provider workflow
Step 1 — Choose provider type: BAD ERA/internal location, Manual Supplier, or Supported Integration.
Step 2 — Manual Supplier fields: provider name, internal code, contacts, ordering portal URL, currency, typical production time, typical shipping time, return behavior, internal notes.
Step 3 — Supported Integration: provider-specific connection UI supplied by an adapter. Secrets/tokens are submitted to server-side secure storage and are never echoed to the browser after save.
Step 4 — Provider is created in DRAFT or SAMPLE_TESTING. Auto-submit remains OFF until validation gates are deliberately passed.
Step 5 — Assign products/variants from Provider Details or from the Product Editor.

### 10.4.6 Provider Details screen

| Overview | Health, connection mode, activation stage, assigned products/variants, open fulfillments, action-required count, recent provider events. |
| Products | Mapped BAD ERA products/variants, supplier IDs/SKUs, availability mode, mapping health, cost metadata. |
| Fulfillments | Provider-specific fulfillment groups with canonical + raw provider states. |
| Costs | Supplier product cost, estimated/actual shipping where available, historical landed-cost data, contribution estimate. Studio-only. |
| Connection | API/manual mode, last successful request/event, webhook health, credential health without exposing secrets. |
| Settings | Auto-submit default, stock buffer, stale-availability behavior, lead-time copy, return destination, disable provider. |


### 10.4.7 Provider performance metrics — truth rules
Metrics are derived from completed provider fulfillment records, never manually entered marketing numbers.
Success rate = accepted/completed provider submissions divided by eligible submissions over the selected window, with clearly documented exclusions.
Average fulfillment time is calculated from accepted/submitted state to shipped state according to provider mode; do not mix customer transit time into production fulfillment time.
On-time ship rate requires a stored promised/estimated ship-by baseline. Hide the metric if no trustworthy baseline exists.
Orders requiring action is a live count of unresolved ACTION_REQUIRED/REJECTED/DEGRADED cases that need owner action.
If sample volume is too small, display “Not enough data” instead of misleading percentages.

### 10.4.8 Official visual — Product Editor → Inventory & Fulfillment
[IMAGE x1]
APPROVED UI REFERENCE — Product Editor → Inventory & Fulfillment. Owner-friendly mode labels map to the technical fulfillment enums defined in this specification.
APPROVED UI REFERENCE — Product Editor / Inventory & Fulfillment. The visual demonstrates STOCKED mode; controls must adapt to each fulfillment mode rather than showing irrelevant fields.

### 10.4.9 Product Editor navigation contract
Product Editor includes General, Media, Variants, Inventory & Fulfillment, Pricing, plus other approved product modules from the main Product Editor contract.
Inventory & Fulfillment is a dedicated product workspace, not a hidden accordion inside General.
A compact product identity panel remains visible: product name, status, stable internal ID/SKU family, thumbnail, and navigation.
Right rail may show inventory by variant, mapping warnings, or contextual help. On smaller screens this becomes an expandable drawer/section.

### 10.4.10 Owner-facing Inventory Mode selector

| I STOCK THIS | Technical mode STOCKED. BAD ERA owns units and fulfills from an internal location such as BAD ERA STOCK. |
| SUPPLIER STOCKS THIS | Technical mode SUPPLIER_STOCKED. Supplier owns inventory and fulfills the item. |
| MADE WHEN ORDERED | Technical mode MADE_TO_ORDER. Provider produces/decorates after a paid order. |
| I SEND ORDERS MANUALLY | Technical mode MANUAL_SUPPLIER. Studio creates an actionable supplier task; owner submits it outside Studio. |
| DON’T TRACK QUANTITY | Technical mode UNTRACKED. Use only where quantity is intentionally not meaningful. |

The owner-facing label is primary in the UI. The technical enum may appear as small supporting metadata, but the Studio should not force the owner to think in backend vocabulary.

### 10.4.11 Conditional fields by mode

| STOCKED | Internal fulfillment location; Track Inventory; Continue Selling When Out of Stock; variant quantities; low-stock threshold; inventory history. |
| SUPPLIER_STOCKED | Provider; supplier product/variant mapping; supplier SKU; supplier cost; availability mode; stock buffer; stale-sync rule; optional auto-submit. |
| MADE_TO_ORDER | Provider; production product mapping; production availability; production lead time; supplier cost; optional capacity/availability status; optional auto-submit. |
| MANUAL_SUPPLIER | Manual provider; supplier SKU/reference; supplier cost; lead time; availability control; order-submission instructions. No fake API/sync controls. |
| UNTRACKED | Fulfillment provider/location and availability state only as needed; quantity controls hidden. |


### 10.4.12 Variant inventory / mapping rail
For STOCKED products, the right rail displays variant + available quantity and links to Manage Variants / Inventory History.
For supplier modes, replace quantity rail with mapping/availability rows when that information is more relevant.
Any unmapped sellable variant receives a visible NEEDS MAPPING state and cannot auto-submit.
Variant counts and provider mapping use stable variant IDs. Changing display labels does not break historical order or provider references.

### 10.4.13 Auto-submit safety
Auto-submit is OFF for newly created external providers and newly mapped products by default.
Auto-submit control is only shown for adapters that implement reliable submission semantics.
Enabling it requires provider activation stage LIVE_AUTOMATED and all active sellable variants mapped/validated.
If any required mapping, credential, provider health, or availability requirement fails, Studio blocks activation and explains the specific issue.
Automatic supplier submission starts only after verified Stripe payment/order creation according to the fulfillment architecture; never from the customer success page.

### 10.4.14 Supplier cost and contribution display
Supplier cost, provider shipping cost, and contribution estimates are Studio-only server-protected commerce data.
Do not call a simplified number “net profit.” Prefer “Estimated Contribution” or “Estimated Margin” and expose which cost inputs are included.
If supplier shipping/cost is unknown or stale, mark the estimate incomplete rather than inventing a value.
Historical orders preserve the cost snapshot used at fulfillment/order time when available, even if supplier pricing changes later.

### 10.4.15 Stale supplier inventory + stock buffer UI

| Supplier reported | Last known supplier available quantity/status; Studio-only unless deliberately exposed. |
| Stock buffer | Safety reserve subtracted from supplier-reported sellable stock. Default provider/product value configurable. |
| BAD ERA sellable | Server-derived external availability after buffer/policy. |
| Last checked | Timestamp and sync health. |
| Stale behavior | PAUSE SELLING recommended default for scarce supplier-stocked goods; alternatives must be explicit. |


### 10.4.16 Manual Supplier fulfillment task UI
A verified paid order routed to MANUAL_SUPPLIER creates a Supplier Order Required task.
Task shows BAD ERA order number, product/variant, quantity, supplier, supplier SKU, validated shipping address, expected supplier cost, lead-time notes, and ordering portal action where configured.
Owner records supplier order/reference number and marks SUBMITTED. Later tracking entry creates a normal BAD ERA shipment record.
The same customer notification/shipment model is used whether tracking came from a manual entry or automated provider webhook.

### 10.4.17 Action Required recovery UI
Paid orders can never disappear because a provider request failed.
Action Required item displays BAD ERA order, provider, affected products/variants, payment state, failure summary, last attempt, and safe next actions.
Allowed next actions can include Retry, Fulfill Manually, Change Future Provider Mapping, or Escalate/Cancel according to operational eligibility.
Retry reuses the same stable fulfillment submission identity/idempotency context so repeated clicks cannot intentionally create duplicate provider orders.

### 10.4.18 Responsive behavior
Desktop follows the approved wide Studio composition.
Tablet collapses secondary navigation/rails as needed while preserving provider cards and inventory-mode selector.
Mobile Studio is operationally usable but not a separate application: provider cards stack, tables become labeled rows, right rails become drawers/sections, and dangerous/primary actions stay clear.
Do not squeeze five inventory-mode cards into an unreadable horizontal row on small screens; use stacked or horizontally scrollable accessible choices.

### 10.4.19 Visual implementation rules
Use BAD ERA design tokens; do not copy Shopify admin styling or third-party provider dashboards.
Near-black/charcoal surfaces, restrained borders, generous space, serif brand moments, compact sans-serif operational labels.
Use color sparingly for semantic state; never make the interface depend on color alone.
Provider logos are optional media assets. The UI must remain coherent when only a provider name/monogram is available.
All counts, cards, metrics, statuses, and variant rows are live components sourced from data; never bake the approved mockup into the application as one image.

### 10.4.20 Acceptance tests — Studio fulfillment UI
Owner can add a Manual Supplier, assign a product, receive a paid supplier task, enter supplier reference/tracking, and complete customer shipment without any external API.
Owner can switch a future product mapping from Manual Supplier to an automated provider without changing the public product URL or historical orders.
Changing Inventory Mode immediately validates incompatible existing settings and requires deliberate confirmation where a change affects sellability/fulfillment.
STOCKED mode shows variant quantities; supplier modes show provider mapping/availability instead of irrelevant local stock fields.
Unmapped variants visibly block LIVE_AUTOMATED auto-submit.
Provider Disabled state blocks new routing but preserves prior provider/order history.
ACTION_REQUIRED is visible from Fulfillment navigation and Provider Details and contains a recoverable next action.
Provider metrics hide or label insufficient/stale data rather than displaying fabricated numbers.
Supplier cost and credentials never appear in the public storefront/client bundle.
The approved dark luxury Studio visual hierarchy remains recognizable at desktop and responsive breakpoints.

## 10.5 APPROVED MANUAL SUPPLIER ORDER + ACTION REQUIRED UI — V1.9 LOCK
The following interface is the approved owner-facing workflow for manually submitting supplier orders and recovering paid orders when external fulfillment fails. Claude must implement the workflow as live BAD ERA Studio components against real order/provider data. The mockup is a visual/interaction reference, not a production screenshot or flattened UI asset.

### 10.5.1 Official visual — Manual Supplier Order + Action Required
[IMAGE x1]
APPROVED UI REFERENCE — Manual Supplier Order + Action Required / Failure Recovery. Product, provider, customer and metric values shown are illustrative; live screens use actual authorized records.
APPROVED UI REFERENCE — BAD ERA Studio / Manual Supplier Order + Action Required. Product/provider/customer values shown are illustrative; live screens must use actual authenticated Studio records.

### 10.5.2 Manual Supplier Order workspace — composition
Route is reachable from Fulfillment → Supplier Orders and from the related BAD ERA Order detail.
Header identifies the fulfillment task as Supplier Order and shows a concise operational state such as REQUIRED / PENDING SUBMISSION / SUBMITTED.
Order identity panel shows BAD ERA order number, verified payment status, customer, order date, provider, fulfillment mode, fulfillment state, and customer order total. Supplier cost is shown separately and never confused with customer total.
Ship To Customer block shows the validated shipping snapshot that belongs to this order. Copy Address copies only the fulfillment address fields needed by the supplier.
Product Details shows customer-facing item name/options plus supplier SKU, quantity, unit supplier cost, estimated supplier shipping, and estimated supplier total cost where known.
Supplier Order block exposes the configured supplier ordering portal/action, supplier order/reference input, and Mark as Submitted action.
Supplier Notes supports internal provider/order instructions such as branding, packaging, or pack-in requirements. Notes are Studio-only unless explicitly mapped into a provider request.

### 10.5.3 Manual submission rules — non-negotiable
Opening a supplier portal does not change fulfillment state.
Mark as Submitted requires a supplier order/reference number unless the configured provider explicitly has no reference-number workflow; any exception must be recorded.
Mark as Submitted stores submitted_at, actor, supplier reference, cost snapshot where available, and an audit event.
SUBMITTED is not SHIPPED. Tracking/shipment creation is a separate later action.
The system must not mark the customer order fulfilled merely because the owner clicked through to a supplier website.
If a manual supplier order was submitted incorrectly, correction is handled by an explicit action and audit trail; never silently overwrite the original supplier reference.

### 10.5.4 Action Required workspace — purpose and composition
Fulfillment → Action Required is the single owner queue for unresolved fulfillment exceptions that require human action.
Default sort prioritizes oldest unresolved customer-impacting issue first; filters may narrow by provider, issue type, state, and age.
Every card shows BAD ERA order number, provider, issue summary/code, last attempt/update, verified payment state, customer, affected product/variant/quantity, supplier reference when known, and attempt count where relevant.
Primary recovery actions are contextual. Do not show Retry Submission for a non-retryable rejection, and do not show Replace Item when no safe/customer-approved replacement exists.
Recently Resolved provides a lightweight audit view of issues that were fixed, including resolution method and timestamp.

### 10.5.5 Canonical fulfillment issue codes

| SUBMISSION_FAILED | Provider request could not be completed because of timeout/network/transient provider failure. Retry may be allowed. |
| PROVIDER_REJECTED | Provider accepted the request channel but rejected the order. Requires reason-specific owner action. |
| SUPPLIER_OUT_OF_STOCK | Supplier reports selected product/variant unavailable after the BAD ERA customer order exists. |
| VARIANT_MAPPING_ERROR | BAD ERA variant cannot be safely mapped to the provider variant/SKU. |
| PROVIDER_AUTH_ERROR | Provider credentials/authorization are invalid or expired. Block auto-submit until connection is repaired. |
| INVALID_FULFILLMENT_ADDRESS | Provider rejects or cannot process the shipping address. Address correction must be controlled and auditable. |
| PROVIDER_RATE_OR_QUOTE_ERROR | Required supplier shipping/cost quote could not be established when the provider workflow requires it. |
| UNKNOWN_PROVIDER_ERROR | Unclassified provider failure. Preserve raw diagnostic data server-side and require owner review. |


### 10.5.6 Recovery action contract

| Retry Submission | Allowed only for retryable/transient failures. Reuses the same fulfillment submission identity/idempotency context; never creates a second intended fulfillment. |
| Fulfill Manually | Moves execution to a manual workflow while preserving the same BAD ERA fulfillment group/order-item obligations. Record the routing override and actor. |
| Contact Supplier | Opens configured contact/portal information and records no fulfillment-state change by itself. |
| Update Mapping | Correct future/current provider mapping only where operationally safe. Historical order-item identity remains immutable. |
| Replace Item | Never silently substitute a materially different item. If a customer-facing substitution is required, capture explicit customer agreement and any price/refund adjustment before fulfillment. |
| Correct Address | Allowed only when legally/operationally valid and before the relevant provider shipment is irreversible. Preserve original order shipping snapshot plus an auditable fulfillment-address correction. |
| Cancel / Refund | When fulfillment cannot be completed, use explicit cancellation/refund flow. Refund through Stripe is separate from supplier cancellation/credit. |


### 10.5.7 Paid-order protection and recovery semantics
A successful customer payment is durable BAD ERA order truth. A provider failure can change fulfillment state, but cannot erase or silently invalidate the paid order.
ACTION_REQUIRED is an operational state, not a payment state.
All retries are bounded and observable. Background automatic retry may be used for transient failures, but repeated failures surface to the owner rather than looping indefinitely.
If the provider eventually reports that an order already exists after a timeout, reconcile against the provider order/reference before submitting again.
Resolved issues remain in history. Resolution never deletes the original failure event.

### 10.5.8 Customer communication rules
Do not send the customer raw provider/API failure messages.
If the issue does not materially change the customer promise, keep it internal while recovery proceeds.
If fulfillment delay, substitution, cancellation, address correction, or refund requires customer action/consent, create a clear BAD ERA-branded communication and retain its event/timestamp.
Customer-facing order status must remain truthful: paid, processing, partially shipped, shipped, cancelled/refunded as applicable.
Supplier names and supplier costs are internal by default unless BAD ERA intentionally chooses to disclose a production partner.

### 10.5.9 Security, privacy and audit rules
Supplier ordering URLs must come from provider configuration; do not accept arbitrary untrusted URLs from customer/order input.
Shipping data is visible only to authenticated authorized Studio users and the minimum server-side provider request required for fulfillment.
Provider credentials and raw secret tokens never reach the browser.
Every manual submission, retry, routing override, address correction, replacement decision, cancellation, tracking update, and issue resolution creates an audit event with actor + timestamp.
Sensitive provider error payloads may be stored server-side for diagnostics but should be summarized/sanitized in the owner UI.

### 10.5.10 Responsive and visual implementation rules
Desktop follows the approved two-workspace visual direction; production routes may be separate pages rather than rendered simultaneously.
On tablet/mobile, stack order identity, shipping, product details, supplier submission and recovery actions vertically with persistent clarity around the primary action.
Tables collapse to labeled item rows; never force horizontal scrolling for critical shipping or recovery data if a stacked presentation is possible.
Use BAD ERA Studio tokens and restrained semantic status color. The interface must not depend on red/amber/green alone; always pair with labels/icons.
The approved mockup must never be used as a clickable background image. Rebuild every field/card/button/status as real accessible Next.js components.

### 10.5.11 Acceptance tests — manual supplier + recovery UI
Paid MANUAL_SUPPLIER order creates one actionable Supplier Order task with the correct address, supplier SKU, variant, quantity and provider.
Opening supplier portal does not mutate fulfillment state.
Mark as Submitted cannot double-submit the same fulfillment intent and stores an auditable supplier reference.
Manual task can progress from PENDING_SUBMISSION → SUBMITTED → SHIPPED using tracking entry without an external API.
A transient API failure creates ACTION_REQUIRED and Retry safely reuses idempotency context.
A provider out-of-stock rejection does not expose Retry as the only action; owner receives appropriate alternate/refund workflow.
Fulfill Manually preserves original order items and fulfillment obligations while changing execution route.
Resolved issues leave an immutable history entry.
Customer never sees supplier cost, internal issue payload, or raw API error.
Mobile rendering preserves all critical actions and does not hide shipping/address or recovery state.

# 11. SITE EDITOR — ALL PAGES
The owner requested one editor system capable of managing all public pages. Build a schema-driven page/section editor, not a one-off homepage editor.

## 11.1 Editor model
Page  id, slug, title, status, seo, revision pointers  Sections[] ordered    section_type    enabled    content payload (validated schema)    style_variant (whitelisted only)    responsive settings (whitelisted only)    linked media/products/collections    stable section_id

## 11.2 Editing behavior
Left: page/section navigator. Center: accurate live preview. Right: properties/content panel (or equivalent elegant arrangement).
Click a section or editable field to edit its content. Text fields do NOT expose arbitrary font size/font family controls.
Allow section reordering only where the page schema marks it safe. Critical global components/header/footer can be locked.
Images: replace, select from Media Library, alt text, focal point, desktop/mobile crop preview, optional mobile override.
Links/CTAs: label + destination; validate internal/external URL; allow disabled state.
Product rails: choose products manually and reorder; prevent unpublished products from leaking live.
Visibility: section enabled/disabled, optional schedule if implemented.
Autosave draft safely; clearly distinguish saved draft from published live state.
Preview desktop/tablet/mobile widths without publishing.
No content edit should mutate the production layout until Publish.

## 11.3 Typography lock
When the owner changes “BAD ERA” to different text, the component keeps the exact assigned display style. Content length may trigger designed wrapping/fit rules, but the editor must not silently change to arbitrary typography. Provide character guidance/warnings rather than freeform design controls.

## 11.4 EXACT SITE EDITOR CONSTRUCTION
Claude must build the Site Editor as a schema-driven visual editor with strong guardrails. It should borrow the practical mental model of a Shopify theme editor - choose a page, select a section, edit settings, preview, save draft, publish - while preserving BAD ERA's custom visual system.

### 11.4.1 Three-pane desktop model

| Left | Page selector + ordered section tree. Expand/collapse sections; drag reorder only when schema permits; toggle enabled/disabled. |
| Center | Live storefront preview rendered from draft data at desktop/tablet/mobile breakpoints. Click-to-select section where practical. |
| Right | Context inspector generated from the selected section schema: copy, image, products, CTA, alignment/variant choices, visibility, responsive focal settings. |

On smaller Studio screens, panes may become drawers/tabs; the data model and actions stay identical.

### 11.4.2 Section registry
Create a typed Section Registry rather than storing arbitrary HTML. Each section_type maps to: React renderer, Zod/input schema, default data, allowed variants, Studio inspector definition, migration/version number.
hero.editorial
trust.strip
campaign.feature
product.rail
editorial.story_grid
archive01.feature
newsletter
footer
Future Lookbook/ERA section types can be registered later without changing existing saved content.

### 11.4.3 Field types Studio must support
Text: plain string with max-length guidance.
Rich text: restricted blocks only where needed; sanitize output.
Media: media_asset_id, alt text, focal X/Y, optional mobile override.
Product reference: stable product_id/variant_id selector.
Collection reference.
CTA: label, internal route/external URL, enabled state.
Boolean visibility toggle.
Enum/select for approved section variants only.
Ordered list of referenced products/media.
Schedule metadata may be added later; not required for v1 unless implemented cleanly.

### 11.4.4 What the editor must NOT expose
No free arbitrary CSS.
No arbitrary font family or font-size inputs.
No unrestricted color picker on core brand components.
No arbitrary absolute positioning.
No arbitrary HTML/JavaScript injection.
No ability for page copy to modify inventory, payment, order, or fulfillment data.

### 11.4.5 Draft/save/preview/publish behavior
Every edit updates draft state, not the live revision.
Autosave is debounced and visibly communicates Saving / Saved / Error.
Preview reads the draft revision using authenticated/signed preview mode and supports desktop/tablet/mobile viewport presets.
Publish performs validation, creates an immutable revision snapshot, updates the live pointer, and revalidates affected Next.js paths/cache.
Previous live revision remains in history so rollback is possible.
Rollback republishes old content as a new revision; it does not erase later history.
If publish validation or persistence fails, live remains untouched.

### 11.4.6 Final-image replacement rule
All current mockup/product/lifestyle images are concept or placeholder assets unless explicitly designated final by the owner. The website must be fully constructible before final photography exists. Replacing any placeholder with final photography in Studio must not require code changes, CSS edits, or a new deployment.

# 12. MEDIA LIBRARY & DEFERRED FINAL PHOTOGRAPHY
This is a critical implementation requirement because the owner will add final images after the website is finished.
Build the entire storefront so every editorial/product image can be swapped from Studio without touching source code.
Media records: ID, storage path, original filename, MIME type, width, height, bytes, alt text, title/internal label, created_at, usage references.
Use Supabase Storage with public storefront assets separated from any private customer/support files.
Generate/serve optimized variants through the chosen image pipeline; keep originals.
Warn before deleting an asset that is referenced by a page/product. Prefer archive over destructive delete.
Provide usage view: “used on Home Hero / Product X / Shop header”.
Focal point controls stored as normalized X/Y.
Optional desktop/mobile image override; otherwise same source uses different crop.
Placeholder mode must be obvious in Studio but visually polished on development builds.
Do not ship concept/mockup screenshots as actual customer-facing photography unless the owner explicitly selects them later.

# 13. PUBLISHING + VERSION CONTROL

## 13.1 State model
DRAFT -> PREVIEW -> PUBLISHED -> ARCHIVEDEach publish creates an immutable revision snapshot. Current live points to one published revision.
Draft edits never overwrite the live revision in place.
Every publish records revision ID, page/content snapshot, actor, timestamp and optional publish note.
Preview renders draft data behind authenticated/signed preview access and never pollutes public cache/SEO.
Rollback means publish a previous revision as a new revision, preserving history.
Global publish should identify affected pages/sections and require explicit confirmation.
Display unsaved/saved-draft/published states clearly.
If publish fails, live site remains on last known-good revision.
Record audit event for publish, rollback, product visibility change, refund, fulfillment and destructive actions.

## 13.2 Concurrency
V1 is owner-first, but still use optimistic version checks/revision IDs so stale tabs cannot silently overwrite newer edits.

# 14. PRODUCT, VARIANT & INVENTORY MANAGEMENT

## 14.1 Product editor
Name, slug, subtitle/short copy, long details, price, compare-at price optional, status, product type, category/collection, fulfillment type/provider, SEO, media gallery, related products, shipping/return flags.
Variant matrix supports size/color/other option architecture, even though initial apparel uses size S/M/L/XL.
Per variant: SKU, option values, price override optional, inventory tracking, quantity, low-stock threshold, weight/metadata as needed.
Product status: DRAFT, ACTIVE, SOLD_OUT (derived/override), ARCHIVED; optional scheduled activation later.
Fulfillment type: BAD_ERA_STOCK / ON_DEMAND / PREORDER. Provider: BAD_ERA / APLIIQ / PRINTFUL / PRINTIFY / OTHER (private Studio metadata).

## 14.2 Inventory rules
Inventory changes are transactional and auditable.
Do not decrement inventory merely because an item enters cart.
At payment confirmation, atomically validate/decrement or use a deliberate reservation strategy.
Refund does not automatically restock. Return receipt can create a restock adjustment.
Manual inventory adjustment requires reason/note and creates inventory movement record.
Overselling behavior must be explicit; default is prevent purchase when tracked stock <= 0.

## 14.3 ARCHIVE 01 — LOCKED STOREFRONT + INVENTORY CONTRACT
Archive 01 is a finite sell-through of genuine early BAD ERA inventory. It must feel intentional and historical, not like a clearance page. The Archive uses the same catalog, variant, inventory, cart, order, Stripe, fulfillment, and returns systems as current products; Archive status is metadata, not a separate commerce engine.

| BAD ERA Original Tee — Archive 01 | Price: $30.00. Color: Black. Valid sizes: S / M / L only. Track inventory per size. Restock policy: NEVER. Continue selling when out of stock: OFF. |
| BAD ERA Original Crossbody — Original | Price: $25.00. Valid color variants: Black / Red / Blue. Approximately 90 bags exist in total, but the exact quantity must be entered in Studio per color before launch. Restock policy: NEVER. |
| Original Era Set | Price: $45.00. Composite bundle containing 1 Original Tee + 1 Original Crossbody. Customer selects tee size S/M/L and bag color Black/Red/Blue. The bundle must never maintain an independent physical stock count. |

ARCHIVE 01 BAG COLORWAYS — Black, Red, and Blue are the locked customer-facing color variants. Exact per-color quantities are entered later in BAD ERA Studio.
[IMAGE x1]
ARCHIVE 01 — ACTUAL CROSSBODY COLORWAY REFERENCE: Black / Red / Blue. Product truth reference for variants; final storefront photography may be replaced by owner-approved production assets.

### 14.3.0 OFFICIAL ARCHIVE 01 STOREFRONT VISUAL — LOCKED
[IMAGE x1]
APPROVED ARCHIVE 01 — DESKTOP STRUCTURAL REFERENCE. The three-card hierarchy and restrained archive treatment are locked; generated product imagery is placeholder and must be replaceable in Studio.
The approved FROM THE ARCHIVE concept below is the official visual reference for the Archive 01 storefront module. Claude must rebuild it as responsive semantic components, not flatten the screenshot into the live page. The module should preserve the dark editorial presentation, generous spacing, quiet typography, three-card hierarchy, and non-clearance tone while using the official owner-supplied BAD ERA logo asset and final owner-supplied product photography.
APPROVED ARCHIVE 01 STOREFRONT REFERENCE — FROM THE ARCHIVE / Original Tee / Original Crossbody / Original Era Set. Rebuild responsively; final imagery remains owner-controlled in Studio.
Headline: FROM THE ARCHIVE. Supporting line direction: “The pieces that came first.” Copy remains Studio-editable, but the tone must stay restrained and historical rather than promotional.
Card 1: Original Tee — $30. Archive 01 label permitted. Product links to the Original Tee PDP.
Card 2: Original Crossbody — $25. Customer-facing color set is Black / Red / Blue. Product links to the Crossbody PDP.
Card 3: Original Era Set — $45. This is the featured value/composite offer, not a separate stock pool. Product links to the bundle selection flow.
Primary section CTA: SHOP ARCHIVE 01 (or equivalent owner-edited label) links to the Archive-filtered collection/section.
No SALE, CLEARANCE, % OFF, countdown, flashing badge, urgency timer, or bargain-bin visual language.
Use the official locked BAD ERA logo artwork in the live component. Any logo visible inside the concept rendering is reference-only and does not override the official logo assets defined earlier in this blueprint.
The entire Archive 01 module must be enable/disable controlled from BAD ERA Studio. The owner can hide it without deleting products or code.
Each card image, title, supporting label, price display source, destination, and card ordering must be data-driven. Product price itself comes from commerce/product data, not duplicated editable copy.
Desktop: three-card editorial row. Mobile: responsive stacked/scrollable composition preserving large product imagery and clear card separation; do not squeeze three desktop cards into an unreadable row.
When all Archive 01 sellable components are depleted, Studio may automatically recommend hiding the homepage module, but it must not silently delete or unpublish historical product pages.

### 14.3.0A OFFICIAL ARCHIVE 01 MOBILE VISUAL — APPROVED
[IMAGE x1]
APPROVED ARCHIVE 01 — MOBILE STRUCTURAL REFERENCE. Same responsive Next.js content/data as desktop; generated product imagery is placeholder only.
Approved Archive 01 mobile composition reference. Product/lifestyle imagery shown is placeholder/reference only and will be replaced in BAD ERA Studio.
Lock the mobile hierarchy and editorial treatment, not the generated product imagery. Mobile must remain a responsive view of the same Next.js storefront and data, not a separate app.

### 14.3.1 Storefront placement
Homepage: compact editorial module near the lower commerce/story portion of the page, not the primary hero. Heading direction: FROM THE ARCHIVE. Supporting copy may reference the pieces that came first. Present the Original Tee, Original Crossbody, and Original Era Set without sale/clearance badges.
Shop All: Archive products participate in the normal product grid. Add ARCHIVE as a restrained category/filter. Product cards may show a subtle ARCHIVE 01 label.
Product pages: Original Tee and Crossbody each surface the Original Era Set as the primary cross-sell/bundle offer.
After depletion: products remain viewable with ARCHIVED / SOLD OUT state and purchasing controls disabled. Do not delete the product history.

### 14.3.1A Studio controls for Archive storefront module
enabled: boolean — controls homepage/storefront module visibility without altering product publication.
headline / supporting_copy: constrained text fields using locked typography styles.
featured_products: ordered references. V1 defaults to Original Tee, Original Crossbody, Original Era Set.
section_media / per-card media: Media Library references with desktop/mobile crop and focal controls.
cta_label / cta_destination: constrained CTA fields.
layout_variant: locked to approved Archive editorial variant in v1; do not expose arbitrary layout builder controls.
prices and stock labels are derived from product/variant commerce state; they are not manually typed into the section editor.

### 14.3.2 Shopify-style variant inventory behavior
BAD ERA Studio inventory behavior should intentionally mimic the practical logic of Shopify while keeping the interface visually calmer. The owner enters inventory quantities in Studio; storefront availability, cart validation, checkout eligibility, low-stock messaging, and bundle availability automatically obey those values.

| track_inventory | Boolean per variant. ON for Archive 01. |
| quantity_available | Integer per variant. Owner enters/adjusts in Studio. |
| continue_selling_when_out_of_stock | Boolean per variant. OFF for Archive 01. |
| low_stock_threshold | Configurable integer; used for storefront messaging and Studio alerts. |
| restock_policy | NEVER for Archive 01. |
| archive_when_depleted | TRUE for Archive 01 product family. |


### 14.3.3 Studio inventory entry
The owner must not need code changes to launch or maintain Archive 01 inventory. Studio provides direct variant-level quantity entry and adjustment history.
Original Tee editor shows exactly three inventory rows: Small, Medium, Large. No XL/2XL should be seeded or inferred for this product.
Crossbody editor shows exactly three color inventory rows: Black, Red, Blue.
Studio may display total bags as a derived sum, but inventory truth remains per color variant.
The current estimate of ~90 total bags is informational only. The exact Black/Red/Blue counts are entered by the owner after physical count.
Every manual adjustment records prior quantity, adjustment amount, resulting quantity, reason, actor, and timestamp.
Support adjustment reasons such as Stock Recount, Damaged, Found Stock, Return Restock, Manual Correction, and Other.

### 14.3.4 Automatic storefront stock messaging

| Above 10 | IN STOCK |
| 5–10 | LIMITED AVAILABILITY |
| 1–4 | ONLY A FEW LEFT |
| 0 | SOLD OUT |

Thresholds should be configurable in Studio. Exact stock counts remain private by default unless the owner explicitly enables them for a product.

### 14.3.5 Composite bundle inventory logic — non-negotiable
The Original Era Set is a virtual/composite product. Its availability is derived from the selected component variants. Never create a separate quantity_available value for the bundle itself.
Maximum sellable quantity for a selected bundle combination = min(selected tee-size quantity, selected bag-color quantity).
If Medium reaches 0, every Medium + Black/Red/Blue bundle combination becomes unavailable automatically.
If Red reaches 0, every S/M/L + Red bundle combination becomes unavailable automatically.
Standalone purchases and bundle purchases draw from the exact same underlying variant inventory pools.
Do not duplicate or reserve separate stock for bundle merchandising.

### 14.3.6 Stripe / order deduction behavior
Inventory must be decremented only from verified server-side commerce events. Cart addition alone does not reduce stock.
For a paid Original Era Set (example: Medium + Blue), the verified idempotent payment/order transaction decrements Original Tee / M by 1 and Original Crossbody / Blue by 1. The order may present one customer-facing bundle line item, but the internal order/fulfillment record must persist the component variants so the packing workflow is unambiguous.

### 14.3.7 Concurrency and oversell protection
At checkout/payment finalization, validate current tracked inventory server-side inside a transaction or equivalent atomic operation.
Two customers attempting to buy the last unit must not both succeed due to client-side stale state.
Inventory mutations must be idempotent against duplicate Stripe webhook delivery.
If stock cannot be fulfilled after payment due to an exceptional race/integration failure, flag the order for owner intervention and do not silently fabricate inventory.

### 14.3.8 Returns / refunds / restocking
Mimic Shopify’s practical separation between refund and restock. A refund does not automatically make an item sellable again.
Studio refund/return flow includes an explicit Restock item? Yes / No decision where operationally appropriate.
If returned merchandise is damaged/worn/not resellable, refund can proceed with no inventory increase.
If accepted for restock, create a positive inventory movement against the exact tee size or bag color.
Bundle returns/refunds operate at component-item level so one component can be restocked while another is not.

### 14.3.9 Archive lifecycle
When one variant reaches 0, only that variant becomes unavailable.
When all tee sizes reach 0, the tee becomes sold out/archived; the bundle becomes unavailable because one required component family is depleted.
When all bag colors reach 0, the bag becomes sold out/archived; the bundle becomes unavailable.
Archive products are not automatically deleted. Keep the historical PDP available unless the owner explicitly hides it.

## 14.4 SHOPIFY-INSPIRED INVENTORY DOMAIN — FULL V1 CONTRACT
This section defines the generalized inventory engine that Archive 01 uses. The intent is Shopify-like operational behavior, implemented natively for BAD ERA.

### 14.4.1 Inventory states and source of truth

| On hand | Physical count controlled by inventory movements/reconciliation. V1 may store this explicitly or derive it if the implementation remains reliable. |
| Committed | Units attached to paid/confirmed orders that have not yet been released/fulfilled according to the chosen reservation model. |
| Unavailable | Units intentionally not sellable (damaged/hold/etc.) if V1 implements this state; otherwise represent through adjustment and audit reason. |
| Available | Sellable quantity used by storefront and bundle calculations. Must never be a client-computed guess. |
| Incoming | Deferred/optional for v1; schema may support purchase orders/restocks later. |

For a simple v1 single-location system, Claude may use available quantity plus durable inventory movements, provided oversell protection and order/refund correctness remain intact.

### 14.4.2 Core inventory policies
track_quantity = true/false per variant.
continue_selling_when_out_of_stock = false by default for stocked BAD ERA goods; may be enabled for explicit preorder/on-demand cases.
available <= 0 and continue_selling=false => variant is not purchasable.
Storefront disabled state is derived from server inventory truth.
Low-stock language is presentation logic; it does not change stock truth.

### 14.4.3 Bundle quantity calculation
For a bundle requiring component quantities q_i with available stock a_i, bundle sellable quantity = floor(min(a_i / q_i)) across tracked components that are not configured to continue selling out of stock. For Original Era Set, one tee + one bag means the sellable quantity for the selected combination is min(selected tee size available, selected bag color available).

### 14.4.4 Inventory movement ledger
Never rely only on overwriting a quantity integer. Maintain a durable inventory_movements ledger so Studio can explain why inventory changed.

| movement_id | Stable ID / UUID. |
| variant_id | Affected variant. |
| location_id | BAD ERA STOCK in v1. |
| delta | Signed integer change. |
| reason | Order, Stock Recount, Return Restock, Damaged, Lost, Found, Manual Correction, Cancellation Release, Other. |
| source | order_id / return_id / refund_id / manual adjustment / import. |
| actor | Studio user or system. |
| created_at | Immutable timestamp. |
| before / after | Persist or make reconstructable for clear audit history. |


### 14.4.5 Checkout/Stripe inventory transaction
Before payment session creation, validate variant existence, active status, price, and current stock; do not trust cart payload.
At the definitive paid-order step, perform inventory mutation exactly once using a transaction/idempotency key tied to the Stripe event/order.
For bundles, mutate component variants, not an invented bundle stock pool.
If using reservations, document reservation expiry/release and test it. If not using reservations, payment-finalization must still prevent double-decrement and detect stock races.
Every inventory mutation writes ledger entries.

### 14.4.6 Order cancellation and refund inventory
Cancellation of an eligible unfulfilled order may release/restock inventory according to explicit owner/system rules and writes a movement.
Refund does not equal restock.
Return receipt plus owner-approved Restock creates a positive movement.
A refunded but non-restocked damaged item remains unavailable.

### 14.4.7 Inventory alerts and dashboard behavior
Low-stock dashboard list derives from variant thresholds.
Out-of-stock variants are immediately visible in Studio.
Archive depleted products can auto-transition to sold-out/archive presentation without deleting history.
Inventory alerts are operational information, not customer-facing urgency marketing.

## 14.5 ZERO-INVENTORY + MULTI-PROVIDER FULFILLMENT ARCHITECTURE — V1.9 LOCK
BAD ERA must support products the owner physically stocks and products the owner never inventories. The architecture is provider-agnostic: the storefront, Stripe checkout, customer account, order history, returns, and BAD ERA Studio remain stable while fulfillment providers can be added, tested, replaced, or upgraded independently.

### 14.5.1 Fulfillment / inventory modes

| STOCKED | BAD ERA owns and tracks physical units. Example: Archive 01. Fulfilled from BAD ERA STOCK. |
| SUPPLIER_STOCKED | Supplier owns inventory. BAD ERA stores supplier mappings and availability/sync state; supplier fulfills customer orders. |
| MADE_TO_ORDER | Product is produced/decorated after purchase. No BAD ERA physical stock quantity is required; production capacity/availability rules replace normal inventory. |
| MANUAL_SUPPLIER | Supplier fulfills, but no API is required. Studio creates an actionable fulfillment task for the owner to submit manually. |
| UNTRACKED | Use only for intentionally untracked sellable goods/services where inventory quantity is not meaningful. |
| PREORDER | Deferred/optional mode for future production. Must not be silently treated as normal in-stock inventory. |


### 14.5.2 Provider-agnostic routing principle
Each sellable variant references a fulfillment mode and fulfillment provider/location.
Provider selection must not be hard-coded into storefront components.
BAD ERA may use different providers for different products in the same customer cart.
A single paid order can split into multiple fulfillment groups based on assigned provider/location.
Customer-facing order history presents one BAD ERA order while supporting multiple shipments/tracking numbers.
Storefront should communicate that items may arrive separately when a mixed-provider order requires split shipment; do not market products as 'dropshipped'.

### 14.5.3 Fulfillment provider adapter contract

| checkAvailability | Return provider availability/stock/capacity when supported. |
| getQuote | Optional provider cost/shipping estimate. |
| submitOrder | Create provider fulfillment request/order using stable BAD ERA fulfillment ID as idempotency reference where supported. |
| cancelOrder | Attempt provider cancellation when supported and operationally eligible. |
| getOrderStatus | Fetch current provider state when polling/manual refresh is needed. |
| getTracking | Retrieve shipment/tracking information when supported. |
| handleWebhook | Validate provider webhook authenticity, deduplicate event, map provider state into BAD ERA fulfillment state. |

Implement adapters behind one internal interface. Provider-specific payloads, authentication, status names, retries, and webhook verification remain inside the adapter layer.

### 14.5.4 Provider states
PENDING_SUBMISSION
SUBMITTED
ACCEPTED
IN_PRODUCTION
SHIPPED
DELIVERED
ACTION_REQUIRED
REJECTED
CANCELLED
Provider-specific statuses map into these BAD ERA canonical states; preserve raw provider status for diagnostics.

### 14.5.5 Manual Supplier mode — required before API integrations
Manual Supplier is a first-class provider type, not a temporary hack.
After verified payment, Studio creates a supplier fulfillment task containing only the information necessary to fulfill that order.
Studio shows supplier, supplier SKU, selected options, quantity, customer shipping address, shipping method/notes, and expected supplier cost.
Owner records supplier order/reference number and later carrier/tracking details.
Manual tracking entry creates the same BAD ERA shipment record/customer notification used by automated adapters.
A product can later migrate from MANUAL_SUPPLIER to an API adapter without changing its public URL, product ID, customer order history, or storefront template.

### 14.5.6 Mixed-cart fulfillment groups
After payment, route order line items into fulfillment groups by provider/location. This follows the proven fulfillment-order concept used by major commerce platforms: items assigned to the same fulfillment location/service can be processed together, while one customer order can have multiple fulfillment groups.
Example: Archive Tee -> BAD ERA STOCK.
Example: Made-to-order hoodie -> apparel POD provider.
Example: BE FRAME -> eyewear supplier.
Each group has independent submission, acceptance, production, shipment, cancellation, failure, and tracking state.
Order is not globally marked fulfilled until all required fulfillment quantities are fulfilled/cancelled according to order rules.

### 14.5.7 Stripe payment boundary and reliability
Customer payment remains Customer -> BAD ERA -> Stripe. Supplier procurement/charges are separate operational costs unless a future provider contract requires another settlement model.
Never submit a supplier fulfillment solely from the browser success page.
Verified server-side Stripe payment events trigger the durable fulfillment-routing workflow.
Fulfillment routing and supplier submission must be idempotent: duplicate/retried payment or provider events cannot create duplicate supplier orders.
If payment succeeds but provider submission fails, preserve the paid BAD ERA order and mark the fulfillment ACTION_REQUIRED; retry safely or allow owner intervention.
Never silently cancel, duplicate, or fabricate fulfillment.

### 14.5.8 Supplier catalog mapping

| provider_id | BAD ERA fulfillment provider. |
| provider_product_id | Supplier's product/template identifier. |
| provider_variant_id | Supplier's exact variant identifier. |
| supplier_sku | Supplier-facing SKU/reference. |
| supplier_cost | Internal estimated/base cost; never customer-facing. |
| currency | Supplier cost currency. |
| availability_mode | API_SYNC / WEBHOOK_SYNC / MANUAL / MADE_TO_ORDER. |
| last_synced_at | Freshness timestamp when external availability is synchronized. |
| sync_status | OK / STALE / ERROR / MANUAL. |

Supplier stock must not be copied into BAD ERA as if BAD ERA owns those units. Preserve ownership/source semantics. If availability data becomes stale, apply a provider-specific safety rule rather than pretending the last known number is current.

### 14.5.9 Studio — Fulfillment Providers module
Add Studio navigation: Fulfillment -> Providers.
Provider list shows name, type, connection mode, status, assigned variants, last sync, open/action-required fulfillments.
Provider detail tabs: Connection, Products, Orders/Fulfillments, Failures, Tracking, Costs, Settings.
Credentials/secrets are stored server-side/encrypted through environment/secret management and never rendered back in plaintext.
Connection health must distinguish CONNECTED, DEGRADED, ERROR, MANUAL, DISABLED.

### 14.5.10 Product Editor — Inventory & Fulfillment panel

| Inventory mode | STOCKED / SUPPLIER_STOCKED / MADE_TO_ORDER / MANUAL_SUPPLIER / UNTRACKED / optional PREORDER. |
| Provider | Select configured provider/location. |
| Supplier mapping | Provider product/variant IDs and supplier SKU. |
| Retail price | BAD ERA customer price. |
| Supplier cost | Private internal estimate/actual where available. |
| Estimated margin | Studio-calculated informational metric; exclude/refine shipping, tax, fees as configured. |
| Availability | Provider-derived/manual status with last checked timestamp. |
| Auto-submit | OFF by default for new providers; enable only after provider integration is validated. |
| Production estimate | Internal and optional customer-facing lead-time mapping. |
| Return destination/policy | BAD ERA / Supplier / Manual Review / Non-returnable only where legally/policy appropriate. |


### 14.5.11 Supplier testing and activation gates
Do not make a new automated provider LIVE immediately after adding credentials.
Provider lifecycle: DRAFT -> SAMPLE_TESTING -> SANDBOX/TEST -> LIVE_MANUAL -> LIVE_AUTOMATED -> DISABLED.
Physical sample approval is a business gate for BAD ERA-branded fashion/accessory products.
Test product quality, branding accuracy, packaging, processing time, shipping, tracking, returns, actual landed cost, and provider communication.
Automate only providers that pass validation; otherwise keep them Manual Supplier or remove them.

### 14.5.12 Initial provider strategy — not permanent dependencies
The system must not hard-depend on these companies. They are initial candidates for testing because they currently expose relevant custom-store/API or fulfillment capabilities. Final provider selection happens after physical validation.

| Apliiq | Candidate for private-label / on-demand apparel. Build adapter only after sample and workflow validation. |
| Printful | Candidate for API-driven print/embroidery/on-demand basics and accessories. |
| Printify | Candidate for experimental POD/provider breadth if selected after testing. |
| Eyewear OEM / dropship supplier | Start MANUAL_SUPPLIER unless a verified API/webhook contract exists. |
| BAD ERA STOCK | Native internal provider for owner-held inventory; always supported. |


### 14.5.13 Returns/refunds across providers
Refund state remains separate from return and fulfillment state.
Each fulfillment/provider defines return destination and operational rules.
A mixed order can have different return destinations by line item.
Supplier return restrictions must never override applicable customer-facing law/policy commitments.
Provider refund/cancellation does not replace Stripe/BAD ERA refund records; reconcile both sides explicitly.

### 14.5.14 Non-negotiable QA
One order containing BAD ERA-stocked + supplier-stocked + made-to-order items creates correct independent fulfillment groups.
Duplicate Stripe webhook cannot create duplicate provider order.
Provider timeout after payment leaves recoverable ACTION_REQUIRED fulfillment.
Manual supplier can be fulfilled end-to-end without API.
Tracking from API webhook and manual entry produce equivalent customer-facing shipment records.
Changing a product's future provider does not mutate historical orders.
Disabled provider prevents new automated submissions but preserves history.
Supplier-stocked product with stale/error availability follows configured safety rule.
Provider credentials never reach browser/client bundle.
Partial shipment and multiple tracking numbers render correctly in customer account.

### 14.5.15 Manual Supplier Order state machine — exact V1.9 contract
PENDING_SUBMISSION: BAD ERA has a paid fulfillment obligation but supplier order has not been confirmed as placed.
SUBMITTED: owner/API has a durable supplier reference or equivalent confirmed submission record.
ACCEPTED / IN_PRODUCTION: optional provider progress states; manual providers may skip them if unavailable.
SHIPPED: shipment/tracking record exists or provider shipment webhook is verified.
DELIVERED: carrier/provider delivery state when available; do not fabricate delivery from elapsed time.
ACTION_REQUIRED / REJECTED: execution exception; does not alter payment truth.
CANCELLED: supplier fulfillment obligation is cancelled according to explicit order/refund workflow.

### 14.5.16 Fulfillment issue/recovery engine
Create a normalized fulfillment issue record whenever an automated/manual fulfillment cannot continue without attention.
Issue record includes fulfillment_group_id, provider_id, issue_code, severity, retryable flag, owner summary, raw diagnostic reference, opened_at, last_attempt_at, resolved_at, resolution_type and resolved_by.
Only one unresolved issue of the same logical failure should be active per fulfillment intent unless a new materially different failure occurs.
Recovery attempts are append-only. Do not overwrite the prior attempt/result.
Resolution types should include RETRIED_SUCCESSFULLY, MANUAL_FULFILLMENT, MAPPING_FIXED, ADDRESS_CORRECTED, REPLACED_WITH_CONSENT, CANCELLED_REFUNDED, PROVIDER_RECOVERED, OTHER.

### 14.5.17 Retry and reconciliation algorithm
Before retrying submitOrder(), check local provider_order_id/reference and adapter reconciliation capability.
If the previous request timed out after reaching the provider, query/reconcile by BAD ERA submission key/provider metadata before creating another external order.
Use exponential/backoff-style bounded retries for transient automated errors where appropriate; after threshold, surface ACTION_REQUIRED.
Never retry non-retryable validation/out-of-stock/rejection failures automatically.
Provider webhook and polling responses are deduplicated and reconciled against the same fulfillment group.

### 14.5.18 Routing override / manual takeover
Fulfill Manually creates an explicit execution override on the existing fulfillment group; do not clone the customer order.
Original provider and failed attempts remain preserved for audit/history.
If the owner routes to a different provider for the current order, store current_order_provider_override separately from the product variant default provider mapping.
Changing the current order route must not silently change the default provider for future orders unless the owner separately edits the product/provider mapping.

# 15. DATABASE / DOMAIN MODEL
Use PostgreSQL through Supabase. Exact columns may evolve, but preserve these domain boundaries and relationships.
catalog  products  product_options  product_variants  product_media  collections  collection_products  inventory_levels  inventory_movementscontent  pages  page_sections  page_drafts  page_revisions  media_assets  navigation_items  site_settingscommerce  carts  cart_items  customers  customer_addresses  orders  order_items  payments  stripe_events  fulfillments  fulfillment_items  shipments  refunds  returns  return_itemssupport  support_cases  support_messages  support_notesadmin  studio_users  audit_events  integration_events

## 15.1 Order snapshots
Orders must snapshot customer/shipping/item/price/product-display data needed to preserve historical truth. Do not render old orders solely from mutable current product records.

## 15.2 STUDIO / INVENTORY TABLE CONTRACT ADDITIONS
inventory_locations: id, name, active, fulfills_online_orders. Seed BAD ERA STOCK.
inventory_levels: variant_id + location_id unique, available/on_hand/committed fields as implementation chooses, timestamps/version.
inventory_movements: immutable adjustment/order/return ledger.
bundle_definitions: bundle product/variant -> component variant relationships and required quantities.
section_definitions are code/registry; page_sections store typed validated content payload + schema_version rather than arbitrary HTML.
page_revisions contain immutable publish snapshots/pointers sufficient to reproduce prior live content.

## 15.3 MULTI-PROVIDER DOMAIN ADDITIONS
fulfillment_providers: id, name, provider_type, connection_mode, status, config_reference, created_at, updated_at.
provider_variant_mappings: variant_id, provider_id, provider_product_id, provider_variant_id, supplier_sku, supplier_cost, currency, availability_mode, sync_status, last_synced_at.
fulfillment_groups: id, order_id, provider_id/location_id, canonical_status, raw_provider_status, provider_order_id, submission_key, timestamps.
fulfillment_group_items: fulfillment_group_id, order_item_id, quantity_required, quantity_fulfilled, component/bundle linkage.
provider_events: provider_id, external_event_id, event_type, payload_reference/hash, processed_at; enforce deduplication where external IDs exist.
provider_attempts: fulfillment_group_id, operation, attempt_no, status, error_code/message, timestamps; supports retries/diagnostics.
shipments: fulfillment_group_id, carrier, tracking_number, tracking_url, shipped_at, delivered_at.
supplier_tasks: fulfillment_group_id, assigned_to, supplier_reference, status, notes, timestamps for MANUAL_SUPPLIER.

## 15.4 MANUAL SUPPLIER + RECOVERY DOMAIN ADDITIONS
supplier_tasks additions: fulfillment_group_id unique where appropriate, status, supplier_reference, ordering_url_snapshot/reference, expected_cost_snapshot, submitted_at, submitted_by, notes, last_updated_at.
fulfillment_issues: id, fulfillment_group_id, provider_id, issue_code, severity, retryable, owner_summary, diagnostic_reference, opened_at, last_attempt_at, resolved_at, resolution_type, resolved_by.
fulfillment_recovery_attempts: issue_id, fulfillment_group_id, operation, attempt_number, idempotency/submission_key, result, provider_reference, error_code, started_at, completed_at, actor/system.
fulfillment_routing_overrides: fulfillment_group_id, original_provider_id, override_provider_id/manual_mode, reason, created_by, created_at. This affects the current fulfillment only unless product mapping is separately edited.
fulfillment_address_corrections: fulfillment_group_id, original_order_address_snapshot_reference, corrected_address_snapshot, reason, actor, created_at. Never mutate historical order snapshot in place.
customer_fulfillment_consents: order_id/fulfillment_group_id, consent_type, proposed_change, customer response/evidence reference, recorded_at; required when a material substitution needs customer agreement.

# 16. TECHNICAL FOUNDATION

| Framework | Next.js App Router + React + TypeScript |
| Styling | Tailwind CSS with centralized BAD ERA design tokens; component variants instead of arbitrary per-page CSS |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth for customer and Studio authentication unless existing repo dictates a compatible secure approach |
| Storage | Supabase Storage |
| Payments | Stripe Checkout / Stripe server APIs + verified webhooks |
| Transactional email | Resend |
| Deployment | Vercel |
| Shipping v1 | Flat-rate + Pirate Ship manual workflow |
| Image delivery | Next.js Image / approved storage host allowlist |


## 16.1 Server/client boundaries
Keep secrets and privileged Supabase/Stripe operations server-only.
Use Server Components by default where beneficial; client components only for interaction.
Mutations must validate auth/authorization, input schema and record state server-side.
Never rely on hidden buttons as authorization.
Generate typed database interfaces and validated request schemas.

# 17. SECURITY, PRIVACY & RELIABILITY
Studio requires authenticated owner/admin access; enable MFA for Studio before production launch if supported by chosen auth flow.
Row Level Security / server authorization must protect customer addresses, orders, returns, support and private data.
Stripe webhook signature verification is mandatory.
Rate-limit auth, support submission and sensitive mutations.
CSRF-safe patterns for state-changing operations; secure cookies where cookies are used.
CSP and explicit image/connect/frame allowlists for trusted providers.
Audit sensitive Studio actions.
Validate uploaded file MIME/magic bytes where relevant; image-only media library should reject unsafe file types.
No secrets in NEXT_PUBLIC_* variables unless intentionally public.
Structured server logs and error tracking; do not log full payment data or unnecessary PII.
Database migrations are versioned and repeatable. Backups/restore procedure documented before launch.

# 18. EMAIL / NOTIFICATION CONTRACT
Order confirmation after verified payment state
Shipping confirmation after tracking/fulfillment
Refund confirmation after Stripe refund success
Return received/status updates where appropriate
Customer account verification/reset flows
Support case acknowledgment/reply
Newsletter signup confirmation strategy as legally/operationally appropriate
Emails should use BAD ERA’s restrained black/ivory identity but prioritize deliverability and readability. Store send attempt/status/provider ID for operational troubleshooting.

## 18.1 FULFILLMENT EXCEPTION COMMUNICATION
Internal provider failures are not automatically customer notifications.
Send customer communication when the issue changes a promised shipment/delivery expectation materially, requires customer action/consent, or results in cancellation/refund.
Replacement/substitution communication must identify the proposed change and any price impact; fulfillment waits for required consent.
Shipping notification is generated from a shipment record, not from SUBMITTED/ACCEPTED provider state.
All transactional messages use BAD ERA voice/branding and link to the BAD ERA order experience rather than exposing provider admin URLs.

# 19. SEO, PERFORMANCE & ACCESSIBILITY
Per-page SEO title/description/OG image editable in Studio; sane fallbacks.
Product structured data only when accurate.
Canonical URLs and noindex for Studio, preview and non-public states.
Generate sitemap from published public routes/products.
Optimize LCP hero images; preload only when justified; lazy-load below fold.
Avoid huge JS animation payloads; motion must not compromise shopping performance.
Respect prefers-reduced-motion.
Keyboard navigation, visible focus, semantic headings, labels, alt text, sufficient contrast and touch target sizing.
Target strong Core Web Vitals on real mobile hardware, not only desktop dev machines.

# 20. REQUIRED QA / ACCEPTANCE MATRIX

## 20.1 Storefront
Desktop + iPhone-sized + common Android/mobile + tablet widths
Header/navigation/cart/search behavior
Home sections with short/long copy and missing optional content
Shop filters/sort and zero-result state
PDP in-stock / low-stock / sold-out / variant unavailable
S/M/L/XL selection; confirm no accidental 2XL seed
Cart quantity update/removal
Checkout address validation and Stripe test payments
Payment success delayed-webhook state
Failed/expired checkout
Customer account/order history/tracking
404/empty/loading/error states
Archive 01 / inventory tests:
Set Tee / M to 0 in Studio -> Medium disabled on standalone PDP and all bundle combinations.
Set Bag / Red to 0 -> Red disabled on bag PDP and all Red bundle combinations.
Standalone bag purchase decrements the same color pool used by bundles.
Standalone tee purchase decrements the same size pool used by bundles.
Bundle purchase decrements exactly one selected tee-size unit and one selected bag-color unit after verified payment.
Duplicate Stripe event does not double-decrement inventory.
Refund without restock leaves quantity unchanged; refund with restock creates explicit positive movement.
Archive product remains viewable after all variants sell out.
Archive 01 visual acceptance:
Desktop Archive module visually follows the approved FROM THE ARCHIVE hierarchy and three-card composition.
Mobile Archive module is intentionally recomposed for touch/mobile and remains elegant/readable.
Disabling Archive module in Studio removes only the module; Archive products/order history remain intact.
Changing product price in Product Editor automatically updates Archive card price; no duplicate manual price string.
Changing Black/Red/Blue inventory immediately affects Crossbody PDP and Original Era Set options after normal cache/revalidation behavior.
Official logo asset is used; concept-render logo is never extracted/recreated as production identity.

## 20.2 Studio
Edit every public page type
Replace image without code change
Desktop/mobile crop preview
Text edit preserves typography
Draft save does not change live
Preview shows draft
Publish updates live
Rollback restores prior content
Product create/edit/archive
Variant/inventory adjustments audited
Order fulfillment + tracking email
Partial refund/return flow
Unauthorized user cannot access Studio

## 20.3 Reliability
Duplicate Stripe webhook
Webhook arrives before success-page read
Network failure during publish
Network failure during refund
Concurrent stale Studio tab edit
Supabase mutation returns error
Resend failure
Out-of-stock race at payment
Deleted/archived product referenced by draft page

## 20.4 V1.9 MANUAL SUPPLIER / FAILURE RECOVERY QA
Supplier Order page renders only authorized real order/provider data and never exposes provider credentials.
Manual supplier task cannot be marked shipped without explicit shipment/tracking or approved no-tracking fulfillment rule.
Supplier reference submission is auditable and repeat clicks cannot create duplicated fulfillment intent.
Retryable timeout, non-retryable rejection, out-of-stock, mapping failure, auth failure and address failure each produce appropriate Action Required states/actions.
Manual takeover and current-order provider override do not mutate future product routing.
Material replacement requires customer consent workflow before shipping.
Cancellation/refund correctly reconciles Stripe/customer side and supplier side separately.
Resolved issue remains visible in history and can be traced to the recovery action/actor.
Mobile Studio can complete the full manual supplier and recovery workflows without hidden critical fields.

# 21. IMPLEMENTATION PHASES FOR CLAUDE

## PHASE 0 — FOUNDATION
Repository baseline, Next.js/TypeScript/Tailwind, design tokens, Supabase project/schema/migrations, auth skeleton, environment validation, route shells. Do not build decorative pages before data foundations exist.

## PHASE 1 — COMMERCE CORE
Products, variants, inventory, cart, Stripe Checkout creation, verified/idempotent webhooks, order snapshots, payment state.

## PHASE 2 — PUBLIC STOREFRONT
Approved Home, Shop All, PDP, cart, responsive/mobile behavior. Use replaceable reference placeholders; do not wait for final photos.

## PHASE 3 — BAD ERA STUDIO CORE
Required outputs: production Studio shell/navigation, Product Editor, Variant Editor, Inventory workspace/adjustment ledger, Media Library, dashboard low-stock/order attention modules, Studio authorization.
Studio shell, dashboard, media library, product/inventory editor.

## PHASE 4 — SITE EDITOR
Required outputs: typed Section Registry, three-pane visual editor, draft autosave, breakpoint preview, typography/layout locks, replaceable media/focal controls, validation, publish integration.
Schema-driven all-page editor, draft autosave, preview, image/text/link/product controls with typography locks.

## PHASE 5 — ORDERS & CUSTOMERS
Customer accounts, addresses, order history/detail, Studio customer/order workspace.

## PHASE 6 — FULFILLMENT
V1.9 UI/behavior gate: implement the approved Fulfillment → Providers, Product Editor → Inventory & Fulfillment, Manual Supplier Order, and Action Required / Failure Recovery workspaces against the provider-agnostic domain. Manual Supplier must pass paid-order → supplier submission → tracking/shipment end-to-end QA. Failure recovery must prove idempotent retry, manual takeover, provider rejection/out-of-stock handling, audit history, and customer-safe communication before any third-party adapter is considered LIVE_AUTOMATED.
Flat-rate configuration, Pirate Ship manual queue/export, tracking, partial/full fulfillment, shipping emails.

## PHASE 7 — RETURNS / REFUNDS / SUPPORT
Return cases, line-item refunds through Stripe, restock decisions, owner-first support cases.

## PHASE 8 — PUBLISHING / VERSION CONTROL
Immutable revisions, publish, rollback, audit events, preview security, cache invalidation.

## PHASE 9 — HARDENING
Security headers, MFA/admin hardening, rate limits, observability, accessibility, SEO, performance, backups.

## PHASE 10 — FULL QA / LAUNCH READINESS
Automated tests, Playwright critical flows, responsive visual QA, Stripe test matrix, production smoke test. STOP and report readiness before public launch.

# 22. CLAUDE CODE WORKING RULES
Before changing code, inspect the existing repository, package.json, routes, migrations, environment conventions and current main branch. Preserve working infrastructure unless this spec explicitly requires replacement.
Create a short implementation plan for the current phase only. Do not attempt every phase in one uncontrolled pass.
Use migrations for schema changes. Never manually depend on an undocumented production database state.
After each phase, run lint/typecheck/tests/build and report exact results.
For UI phases, capture desktop and mobile screenshots and compare against the visual references in this document.
If a requirement is ambiguous, choose the solution that preserves data integrity, owner editability, responsive elegance and future extensibility; document the assumption.
Do not fabricate API keys, Stripe price IDs, Supabase secrets, product photos, customer testimonials, stock counts or shipping promises.
Do not use concept screenshots as flattened page backgrounds. Rebuild the interface as semantic responsive components.
Do not hard-code copy/images that Studio is supposed to manage.
Do not launch publicly at the end. Stop at launch-readiness and present remaining environment/content tasks to the owner.

# 23. DEVELOPMENT SEED CONTENT & IMAGE HANDOFF
Claude may seed development data so layouts can be tested, but seed content must be clearly replaceable and non-authoritative.
Use approved concept imagery only as development/reference content where useful.
Final images will be supplied and inserted by the owner after the website and Studio are complete.
Seed product names may include the known BAD ERA concepts (Blessed 00 Tee, BE YOU Hoodie, BAD ERA bag, etc.) only to exercise the UI; Studio must allow rename/archive/replacement.
Do not assume generated clothing renders are exact manufacturing truth.
Provide a final “Content Handoff Checklist” listing every image/copy slot the owner should replace before launch.
Archive 01 physical inventory count before launch: exact Tee S/M/L quantities and exact Crossbody Black/Red/Blue quantities entered into Studio.

## 23.1 Required final handoff checklist
Official BAD ERA logo files — already supplied/locked; production should use the exact source artwork.
Home hero desktop/mobile image
ERA feature image
Featured product photography
Editorial story images
Shop header image
Each product gallery
Product descriptions/material/care/fit copy
Policies and shipping/return language
Social links/newsletter configuration
Stripe live keys/webhook endpoint
Supabase production environment
Resend verified sending domain
Flat shipping amount
Pirate Ship operational process
Legal review as appropriate

# 24. DEFERRED / FUTURE SYSTEMS
Lookbook: approved dark luxury digital campaign journal with large LOOKBOOK hero, mixed editorial image rhythm, numbered sections (Current / People / Details / Objects / Night), subtle product discovery links and Shop the Current Era transition. Keep content model extensible for this later.
ERA 00 collection editorial landing: concept preserved for later; collection data model should support future storytelling modules.
BE FRAME 00 “GLIM”: approved future eyewear direction; product catalog must support accessories with no size option and custom fulfillment/provider metadata.
Rollo Wireless: later label-print integration.
On-demand/private-label supplier automation: later; v1 can represent provider internally without automatic order routing.
Advanced Studio staff roles/permissions: later. Owner-first v1, but schema should not make multi-user impossible.
Live shipping rates/carrier API: later if flat rate is replaced.
Approved future Lookbook direction — do not block v1 launch.
Approved BE FRAME 00 “GLIM” direction with restrained BE hardware — future accessory/product reference.

## 24.1 APPROVED DEFERRED VISUAL REFERENCES — PRESERVE, DO NOT SHIP IN V1
These concepts are approved for future implementation or product development. Preserve their direction in the project archive, but do not add the corresponding storefront pages/features to the initial launch unless the owner explicitly activates them.

### 24.1.1 Lookbook — future digital campaign journal
[IMAGE x1]
APPROVED FUTURE LOOKBOOK CONCEPT — dark luxury campaign journal. Deferred from initial launch.

### 24.1.2 ERA 00 — future collection landing page
[IMAGE x1]
APPROVED FUTURE ERA 00 LANDING CONCEPT — preserve for later; not part of initial live storefront.

### 24.1.3 BE FRAME 00 “GLIM” — future eyewear direction
[IMAGE x1]
APPROVED BE FRAME 00 “GLIM” DIRECTION — gloss-black rectangular acetate, dark lenses and restrained BE hardware. Eyewear remains future product development, not a v1 launch dependency.

### 24.1.4 Quiet-luxury / Riviera apparel direction
[IMAGE x1]
OWNER-SUPPLIED QUIET-LUXURY INSPIRATION — use only for mood, silhouette, fabric/fit and understated-branding direction. Do not copy the pictured garment/look exactly.

# 25. APPROVED VISUAL REFERENCE BOARD
These images communicate hierarchy, atmosphere, spacing, product presentation and brand restraint. Claude should rebuild responsive interfaces from components—not reproduce screenshots as single images.

## 25.1 APPROVED STUDIO FULFILLMENT VISUAL
The BAD ERA Studio Fulfillment → Providers and Product Editor → Inventory & Fulfillment mockup embedded in Section 10.4 is an official approved visual reference. It defines composition and interaction hierarchy; all displayed provider/product data in the mockup is illustrative until sourced from live Studio records.

## 25.2 APPROVED MANUAL SUPPLIER + RECOVERY VISUAL
The BAD ERA Studio Manual Supplier Order + Action Required / Failure Recovery mockup embedded in Section 10.5 is an official approved visual and interaction reference. It locks the hierarchy, information grouping, recovery-action emphasis, and dark premium Studio language. All customer, provider, product, price, date, and status values shown in the concept are illustrative until populated from live authenticated data.

## 25.3 VISUAL ASSET AUDIT — V1.9
V1.9 repairs the visual-reference layer so approved images are actually referenced in the DOCX body rather than merely existing as unused package media. The classifications below control how Claude should interpret each visual.
GLOBAL CONCEPT-IMAGE POLICY — A visual reference locks the approved composition, hierarchy, interaction pattern or product direction stated in its caption. Generated product/lifestyle imagery is placeholder/reference unless explicitly designated a final owner asset. Final production imagery remains replaceable through BAD ERA Studio without code changes.

| Asset / group | Classification | Placement | Implementation rule |
| Official BE monogram | OFFICIAL / ACTIVE | Identity §0.3 | Exact owner artwork; never redraw/reconstruct. |
| Official logo usage board | OFFICIAL / ACTIVE | Identity §0.3 | Owner-supplied usage authority; supersedes generated identity boards. |
| Homepage 3.0 | APPROVED / ACTIVE | Homepage §3 | Structure/rhythm; final photos replaceable. |
| Shop All desktop | APPROVED / ACTIVE | Shop All §4 | Desktop structural reference. |
| Shop All mobile | APPROVED / ACTIVE | Shop All §4 | Responsive structural reference. |
| Product 01 desktop | APPROVED / ACTIVE | PDP §5 | Editorial Commerce template. |
| Product mobile | APPROVED / ACTIVE | PDP §5 | 2XL shown in concept is invalid/superseded. |
| Studio visual editor | APPROVED / ACTIVE | Studio §10 | Live component UI, never flattened screenshot. |
| Fulfillment → Providers | APPROVED / ACTIVE | Studio §10.4 | Live provider data only. |
| Product Inventory & Fulfillment | APPROVED / ACTIVE | Studio §10.4 | Owner-friendly mode selector. |
| Manual Supplier + Action Required | APPROVED / ACTIVE | Studio §10.5 | Failure/recovery interaction reference. |
| Archive desktop | APPROVED / ACTIVE | Archive §14.3 | Layout locked; images replaceable. |
| Archive mobile | APPROVED / ACTIVE | Archive §14.3 | Responsive layout locked. |
| Archive bag Black/Red/Blue | OWNER PRODUCT REF | Archive §14.3 | Actual variant/color truth reference. |
| Lookbook | APPROVED / DEFERRED | Future §24.1 | Preserve; do not ship initially. |
| ERA 00 landing | APPROVED / DEFERRED | Future §24.1 | Preserve; do not ship initially. |
| BE FRAME 00 GLIM | APPROVED / DEFERRED | Future §24.1 | Future eyewear/product development. |
| Quiet-luxury inspiration | OWNER REF / FUTURE | Future §24.1 | Inspiration only; no exact copying. |
| TOPS / OUTERWEAR / ACCESSORIES tiles | APPROVED / REUSABLE | Campaign refs §25.4 | Approved media refs; homepage category row itself was removed. |
| Bag lifestyle / atmosphere / still-life | APPROVED / REUSABLE | Campaign refs §25.4 | Reusable mood/campaign direction; not required launch sections. |
| Generated logo-system board | SUPERSEDED / EXCLUDED | Do not use | Not authoritative; remove from active package media. |
| Generated luxury identity board | SUPERSEDED / EXCLUDED | Do not use | Not authoritative; remove from active package media. |


## 25.4 APPROVED REUSABLE CAMPAIGN / CATEGORY MEDIA REFERENCES
These visuals remain approved campaign/media references for future placement, collection cards, editorial modules or temporary placeholders. The previously explored homepage category-tile row was removed from the approved Homepage 3.0 structure; preserving these images does NOT re-add that row.

| TOPS — approved category/campaign reference. | OUTERWEAR — approved BE YOU / nighttime reference. |
| ACCESSORIES — approved crossbody detail reference. | BAG LIFESTYLE — approved on-body/night direction. |
| BRAND ATMOSPHERE — dark California-night / automotive mood reference. | LUXURY STILL LIFE — approved object/detail mood reference. |


## 25.5 EXCLUDED / SUPERSEDED VISUALS
Do not use, export, trace, reconstruct or treat earlier generated BAD ERA logo-system / luxury-identity boards as authoritative assets. They are superseded by the exact owner-supplied monogram master and owner-supplied official usage board in §0.3. V1.9 package cleanup removes unreferenced image parts where practical so obsolete graphics are not accidentally reused.

## 25.6 V1.9 VISUAL QA ACCEPTANCE
Every approved active/deferred/reusable visual listed in §25.3 must be visibly embedded in the document body or represented in §25.4; a file merely present inside the DOCX ZIP does not count.
Every embedded concept has a caption that states whether it is structural, owner product truth, reusable campaign reference or deferred inspiration.
Final production photography can replace placeholders through Studio without rebuilding page components.
Official logo references must resolve only to owner-supplied artwork; generated identity boards must not be referenced by the document body.

# 26. DEFINITION OF DONE — V1
Public BAD ERA storefront is responsive, performant and visually faithful to the approved dark luxury direction.
Home, Shop All, Product, Cart/Checkout, Account, policies/support are functional.
Final photography can be replaced entirely through Studio without code changes.
Studio manages pages, sections, text, images, products, variants, inventory, orders, customers, fulfillment, returns/refunds, support and settings.
Typography/layout guardrails prevent content editing from breaking the design.
Stripe payments/refunds are server-verified and idempotent.
Flat-rate shipping + Pirate Ship manual fulfillment works end to end.
Publishing uses drafts, preview, immutable revisions and rollback.
Critical security/accessibility/performance/SEO checks pass.
Automated tests cover critical commerce and publishing paths.
Production launch is not performed automatically; Claude provides a launch-readiness report and owner content/environment checklist.
END OF MASTER SPECIFICATION — Preserve locked product behavior, data integrity, visual restraint, and owner editability.

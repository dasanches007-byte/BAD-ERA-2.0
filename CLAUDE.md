# BAD ERA — Project Memory

BAD ERA is a premium dark-luxury / streetwear commerce brand. This repository builds two
things: the **public storefront** and **BAD ERA STUDIO** (the owner's private operating
system for the store).

**Read this file first, every session.** It is the condensed contract. The full authority
lives in the documents listed under "Sources of truth" below.

---

## Sources of truth (precedence order)

| Rank | Document | Authority |
|---|---|---|
| 1 | `docs/source/BAD_ERA_Master_Product_Engineering_Spec_v1.9.docx` (text: `docs/spec/master-spec-v1.9.md`) | Product, UX, visual, workflow and business intent |
| 2 | `docs/source/BAD_ERA_Claude_Build_Kickoff_Package_v0.2.docx` (text: `docs/spec/kickoff-v0.2.md`) | Security model, atomic commerce, fulfillment contract |
| 3 | `architecture/architecture-contract.md`, `architecture/security-contract-v0.2.md` | Runtime shape, dependency direction, security boundary |
| 4 | `supabase/migrations/0001…0009` | Exact table names, migration order |
| 5 | `architecture/application-folder-tree.txt` | Application folder boundaries |

Where v1.9 was intentionally conceptual about table names, migration order or folder
boundaries, the Kickoff v0.2 package wins. For everything else — product behaviour, visual
language, workflow — v1.9 wins.

Kickoff v0.2 supersedes v0.1. Master spec v1.9 supersedes v1.7.

---

## Non-negotiables

These are locked. Do not redesign, simplify away, or "improve" them without the owner
explicitly changing the spec.

### Brand & identity
- **The logo is locked.** Use `brand/logo/bad-era-monogram-master.png` — the overlapping
  B–E serif monogram with the four-point sparkle. **Never** redraw, trace, reconstruct with
  web fonts/CSS, regenerate, stretch, recolor, re-space, or alter its geometry. Never remove
  or reposition the sparkle. Preserve aspect ratio and clear space. Use the inverse variant
  on light backgrounds (`brand/logo/bad-era-logo-usage-board.jpeg` defines approved variants).
- Any logo visible *inside* a concept mockup is reference-only and never overrides the
  official artwork.
- The brand must feel editorial, cinematic, restrained, expensive, intentionally minimal.
  Not a generic Shopify theme. Not a SaaS dashboard.

### Photography
- **Final production photography does not exist yet.** The owner adds it AFTER the site and
  Studio are finished.
- Build every image as a replaceable slot: media asset ID, alt text, desktop focal X/Y,
  mobile focal X/Y, optional per-breakpoint override.
- **Never** bake mockup imagery into component code, CSS backgrounds, or layout assumptions.
- **Never** flatten an approved mockup into a background image. Rebuild every card, field,
  button and status as a real, accessible component.
- Replacing a placeholder with final photography in Studio must require **zero** code
  changes, CSS edits, or redeploys.

### Commerce
- **Stripe is payment truth.** The success page is never payment truth and never performs
  fulfillment. Only verified, idempotent webhooks mark an order paid.
- The checkout invariant, in full:
  `cart → durable checkout snapshot + inventory reservation → Stripe Checkout → verified
  webhook → one atomic order/inventory conversion → fulfillment groups`
- Inventory is **never** decremented because an item entered a cart.
- Sizes for initial apparel are **S / M / L / XL only**. Never seed or infer 2XL. (A concept
  mockup shows 2XL — that label is superseded and invalid.)
- Never fabricate API keys, Stripe price IDs, Supabase secrets, product photos,
  testimonials, stock counts, or shipping promises.

### Security
- The anonymous browser role gets **no** public-table grants. Storefront data is rendered by
  trusted Next.js server code, not by anonymous Data API reads.
- The Supabase service-role key is **server-only** and must never be importable from a
  client bundle.
- Studio authorization comes from the `studio_users` table — **never** from user-editable
  JWT `user_metadata`.
- Every `SECURITY DEFINER` function uses `search_path = ''` and schema-qualified names.
- Supplier costs, provider credentials, internal notes and audit data never reach the
  storefront or the browser.

### Editing guardrails
Studio edits content, not design. The Site Editor must **never** expose: arbitrary CSS,
arbitrary font family or font size, unrestricted color pickers on core brand components,
absolute positioning, raw HTML/JS injection, or any path from page copy to inventory /
payment / order / fulfillment data.

---

## Visual system

| Token | Value |
|---|---|
| Backgrounds | Near-black / charcoal, subtle warm-black variation |
| Text | Bone / ivory / soft white; secondary gray. **No** bright dashboard blues |
| Accent | Restrained metallic / silver / stone. Color comes from photography, not chrome |
| Borders | Hairline, low-contrast, deliberate |
| Headlines | Elegant editorial serif / high-fashion display |
| Utility & nav | Small uppercase sans-serif, generous tracking |
| Motion | Slow controlled fades, image reveals, subtle hover shifts. Never bouncy or gamified. Respect `prefers-reduced-motion` |
| Spacing | Generous cinematic rhythm; sections breathe |

Semantic status color is used sparingly and **never alone** — always pair color with a label
or icon.

Mobile is intentionally composed, not a squeezed desktop layout. One design system across
both. Never squeeze a five-card row into an unreadable horizontal strip on small screens.

---

## Technical foundation

- **Next.js App Router only** — never introduce the Pages Router
- React + TypeScript throughout
- Tailwind CSS with centralized BAD ERA design tokens; component variants over per-page CSS
- Supabase: PostgreSQL + Auth + Storage
- Stripe Checkout + server APIs + verified webhooks
- Resend for transactional email
- Vercel deployment target
- v1 shipping: flat rate + Pirate Ship manual fulfillment (no carrier-rate API, no Rollo)

**Dependency direction — do not violate:**
```
UI  →  domain service  →  repository/query layer  →  Supabase/PostgreSQL
External webhook  →  verifier  →  domain service  →  transaction/idempotency  →  database
Provider adapter  →  normalized BAD ERA fulfillment state
```

Server Components are the default for reads. Client Components are limited to interaction.
Domain services own business rules — UI components never write tables directly. External
webhooks and privileged mutations terminate in Route Handlers that call domain services.

---

## Database — 62 tables

Apply migrations strictly in order `0001 → 0012`. Never hand-recreate the schema in the
Supabase dashboard. `supabase/seed.sql` is **development data only**.

`0010`, `0011` and `0012` are BAD ERA additions, not part of the delivered Kickoff v0.2 package. Both
were found by executing the migrations and the acceptance matrix against real PostgreSQL —
static validation cannot catch either.

- **`0010`** — `convert_paid_checkout` used `on conflict (external_payment_intent_id)`
  against a **partial** unique index. PostgreSQL only infers a partial index when the
  statement repeats the predicate, so every call raised "no unique or exclusion constraint
  matching the ON CONFLICT specification". No verified Stripe payment could produce an order.
- **`0011`** — `release_checkout_inventory` assigned an untyped `case … end` (which resolves
  to `text`) into the `reservation_status` enum column, so every call raised. That is the
  only path that returns reserved stock, so expiry, payment failure and the abandoned-checkout
  sweep all failed: every abandoned checkout stranded its units permanently.

Migrations `0001-0009` are left byte-identical to the delivered package so their published
SHA-256 checksums still verify.

`supabase/schema.combined.sql` is the full combined schema for reference.

**Domain groups:** identity/admin · catalog · providers · customers/carts · inventory ·
orders/payments · fulfillment · returns/refunds · support · content/publishing · checkout
snapshots.

**Atomic commerce RPCs** (`0008`), all transactional and idempotent:

| RPC | Invariant |
|---|---|
| `reserve_checkout_inventory` | Row-locks inventory; prevents oversell; append-only movement |
| `mark_checkout_payment_pending` | Delayed payment keeps stock reserved — does **not** release |
| `release_checkout_inventory` | Releases exactly once on expiry / failure / cancellation |
| `release_expired_checkout_inventory` | Recovery sweep for abandoned checkouts |
| `convert_paid_checkout` | One transaction: order + item snapshots + inventory conversion + payment + fulfillment groups |
| `studio_adjust_inventory` | Owner-only audited adjustment; blocks system-only reasons |

Helpers: `private.is_studio_owner()`, `private.current_customer_id()`.
Stripe event claiming: `claim_stripe_event()` / `finish_stripe_event()`.

`src/lib/db/commerce-rpc.ts` is deliberately a **throwing placeholder**. It marks the v0.2
application boundary. Implementing it against the server-only Supabase admin client is a
v0.3 task — do not pretend the application layer is finished.

---

## Local database validation

There is no hosted Supabase project yet. `scripts/local-db.sh` runs the full schema against
a local PostgreSQL 16 cluster so migrations, RLS and the commerce RPCs can be verified
without one.

```sh
npm run db:start     # initdb, start on :5433, replay migrations + seed
npm run db:reset     # drop and replay from scratch
npm run db:verify    # assert the 62-table / RLS / owner-policy / search_path invariants
npm run db:types     # regenerate src/lib/db/generated.types.ts from the live schema
npm run db:acceptance   # the v0.2 acceptance matrix, including the last-unit race
```

The acceptance matrix (`tests/integration/sql/`) is where the real commerce guarantees are
proven — atomicity, idempotency and oversell protection live in PostgreSQL, not in
TypeScript. Run it after ANY change to a migration or an RPC.

`scripts/supabase-shim.sql` recreates the platform objects Supabase provides (the `auth`
schema, `auth.uid()`, and the `anon` / `authenticated` / `service_role` roles). It is for
local validation **only** and must never be applied to a hosted project.

When the hosted project exists, regenerate types with the official Supabase CLI or the
Supabase MCP `generate_typescript_types` tool — the output shapes are interchangeable.

---

## Stripe webhook contract

Read the body with `request.text()` **before** signature verification. Never call
`request.json()` first — Stripe signature verification requires the unmodified raw body.

| Event | Action |
|---|---|
| `checkout.session.completed` + paid | `convert_paid_checkout` |
| `checkout.session.completed` + unpaid delayed method | `mark_checkout_payment_pending` — **do not release stock** |
| `checkout.session.async_payment_succeeded` | `convert_paid_checkout` |
| `checkout.session.async_payment_failed` | Release reservation, mark `payment_failed` |
| `checkout.session.expired` | Release reservation, mark `expired` |
| Duplicate event ID | `claim_stripe_event` returns false — no second commerce action |

Return 5xx on transient failure so Stripe retries; event claiming makes it idempotent.

---

## Fulfillment — provider-agnostic

One internal adapter contract (`src/lib/fulfillment/contract.ts`). Storefront, cart, order
and Studio business logic must contain **zero** provider-specific branching. New providers
implement the contract; provider auth, payload shapes, status names and retries stay inside
the adapter.

**Inventory / fulfillment modes** (owner-facing label → technical enum):

| Owner sees | Enum |
|---|---|
| I stock this | `STOCKED` |
| Supplier stocks this | `SUPPLIER_STOCKED` |
| Made when ordered | `MADE_TO_ORDER` |
| I send orders manually | `MANUAL_SUPPLIER` |
| Don't track quantity | `UNTRACKED` |
| *(deferred)* | `PREORDER` |

The owner-facing label is primary in the UI; the enum is small supporting metadata.

**Canonical provider states:** `PENDING_SUBMISSION → SUBMITTED → ACCEPTED → IN_PRODUCTION →
SHIPPED → DELIVERED`, plus `ACTION_REQUIRED`, `REJECTED`, `CANCELLED`. Always preserve the
raw provider status alongside the canonical one for diagnostics.

**Provider lifecycle:** `DRAFT → SAMPLE_TESTING → SANDBOX/TEST → LIVE_MANUAL →
LIVE_AUTOMATED → DISABLED`. Auto-submit is **OFF** by default for every new provider and
newly mapped product. Physical sample approval is a business gate.

**Rules that keep paid orders safe:**
- A successful payment is durable order truth. A provider failure changes fulfillment state
  and can never erase or invalidate the paid order. `ACTION_REQUIRED` is an operational
  state, not a payment state.
- Never submit a supplier order from the browser success page.
- Never submit a supplier order inside the same transaction that records Stripe payment truth.
- Retry reuses the same submission key / idempotency context — repeated clicks can never
  create a second provider order. Reconcile before re-submitting after a timeout.
- Never automatically retry non-retryable failures (validation, out-of-stock, rejection).
- Supplier quantity is provider data. It is **never** treated as BAD ERA on-hand inventory.
- A mixed cart produces **one** BAD ERA order with **independent** fulfillment groups.
- Changing a product's future provider never mutates historical orders.

**Issue codes:** `SUBMISSION_FAILED`, `PROVIDER_REJECTED`, `SUPPLIER_OUT_OF_STOCK`,
`VARIANT_MAPPING_ERROR`, `PROVIDER_AUTH_ERROR`, `INVALID_FULFILLMENT_ADDRESS`,
`PROVIDER_RATE_OR_QUOTE_ERROR`, `UNKNOWN_PROVIDER_ERROR`.

**Recovery actions:** Retry Submission · Fulfill Manually · Contact Supplier · Update
Mapping · Replace Item (requires recorded customer consent) · Correct Address (never mutates
the original order snapshot) · Cancel/Refund. Recovery attempts are append-only; resolved
issues stay in history.

Manual Supplier is a **first-class provider type, not a temporary hack**. `SUBMITTED` is not
`SHIPPED`. Opening a supplier portal changes no state.

---

## ARCHIVE 01 — locked product contract

A finite sell-through of genuine early BAD ERA inventory. It must feel intentional and
historical, **never** like a clearance page. No SALE / CLEARANCE / % OFF / countdown /
flashing badge / urgency timer / bargain-bin language, ever.

| Product | Price | Variants | Rules |
|---|---|---|---|
| BAD ERA Original Tee — Archive 01 | $30.00 | Black; **S / M / L only** | Track inventory per size. Restock: NEVER. Continue-selling: OFF |
| BAD ERA Original Crossbody | $25.00 | Black / Red / Blue | ~90 bags total (informational). Exact per-color counts entered in Studio. Restock: NEVER |
| Original Era Set | $45.00 | 1 Tee + 1 Crossbody | **Virtual composite. Never holds its own stock count** |

**Bundle math:** sellable quantity for a chosen combination = `min(selected tee-size
available, selected bag-color available)`. Generally `floor(min(aᵢ / qᵢ))` across tracked
components. Standalone and bundle purchases draw from the **exact same** variant pools.

A paid Medium + Blue set decrements Tee/M by 1 and Crossbody/Blue by 1. The order may show
one customer-facing bundle line, but must persist the component variants internally so
packing is unambiguous.

**Storefront stock messaging** (thresholds configurable in Studio; exact counts stay private
unless the owner enables them):

| Available | Message |
|---|---|
| > 10 | IN STOCK |
| 5–10 | LIMITED AVAILABILITY |
| 1–4 | ONLY A FEW LEFT |
| 0 | SOLD OUT |

Homepage module: **FROM THE ARCHIVE** / "The pieces that came first." Three-card editorial
row on desktop, stacked on mobile. Entirely enable/disable-able from Studio without deleting
products or code. Prices derive from commerce data — never a duplicated editable string.

After depletion, products stay viewable as ARCHIVED / SOLD OUT with purchase controls
disabled. Product history is never deleted.

---

## Information architecture

**Public:** `/` · `/products/[slug]` · `/cart` · `/checkout` · `/account` (+ `/orders`,
`/orders/[id]`, `/profile`, `/addresses`) · `/support` · `/returns` · `/about` · `/privacy` ·
`/terms` · `/shipping` · `/returns-policy`

**Studio:** `/studio` · `/site` (+ `/[page]`) · `/products` (+ `/[id]`) · `/inventory` ·
`/orders` (+ `/[id]`) · `/customers` (+ `/[id]`) · `/fulfillment` (Overview · Ready to Ship ·
Supplier Orders · Providers · Action Required · Shipments · History) · `/returns` ·
`/support` · `/media` · `/publishing` · `/settings`

**Deferred — do not ship in v1:** `/lookbook`, ERA 00 editorial landing, Rollo Wireless
printing, multi-employee roles, live carrier rates.

**Homepage 3.0 structure:** header → cinematic hero (single SHOP NOW; **no** "Not a Scammer"
subtitle) → trust strip → ERA campaign feature → Featured Drops (Studio-curated) → editorial
story row (three tiles) → footer. The four-tile category row
(Tops/Outerwear/Accessories/Lookbook) was **removed** from the approved revision.

---

## Order & content state machines

**Order:** `PENDING_PAYMENT → PAID → UNFULFILLED → IN_PROGRESS → FULFILLED`, plus
`CANCELED | PARTIALLY_FULFILLED | REFUNDED | PARTIALLY_REFUNDED`.

Keep `payment_status`, `fulfillment_status`, `return_status` and `refund_status` as
**separate fields**. Never collapse operational truth into one overloaded badge.

**Returns:** `REQUESTED → REVIEW → APPROVED → RECEIVED → REFUNDED`, plus
`REJECTED | CANCELED | CLOSED`. **Refund ≠ restock** — restock is an explicit, separate
per-item Studio decision after receipt.

**Publishing:** `DRAFT → PREVIEW → PUBLISHED → ARCHIVED`. Every publish creates an immutable
revision snapshot; live points at one published revision. Draft edits never overwrite live
in place. Rollback republishes an older revision as a *new* revision — it never erases
history. If publish fails, live stays on the last known-good revision.

Orders snapshot customer / shipping / item / price / display data. **Never** render a
historical order from mutable current product records.

---

## Site Editor

Schema-driven, not a one-off homepage editor. Three panes: page + section tree (left), live
draft preview at desktop/tablet/mobile (center), schema-generated inspector (right).

Build a typed **Section Registry** — never store arbitrary HTML. Each `section_type` maps to
a React renderer, a Zod schema, default data, allowed variants, an inspector definition and a
migration version.

Registered v1 sections: `hero.editorial` · `trust.strip` · `campaign.feature` ·
`product.rail` · `editorial.story_grid` · `archive01.feature` · `newsletter` · `footer`.

Field types: text (with max-length guidance) · restricted rich text · media (asset id, alt,
focal X/Y, optional mobile override) · product reference · collection reference · CTA (label,
destination, enabled) · boolean visibility · enum of approved variants · ordered reference
list.

Autosave draft with visible Saving / Saved / Error. Typography is locked — changing the words
"BAD ERA" to other text keeps the exact assigned display style. Give character guidance and
warnings, never freeform design controls.

---

## Domain layer (Phase 1)

```
src/lib/
  settings/store.ts               typed site_settings reader
  inventory/availability.ts       PURE rules: bundle math, stock states, clamping
  catalog/availability-lookup.ts  the ONE place sellable quantity is resolved
  catalog/queries.ts              customer-safe product/variant projections
  cart/service.ts                 cart lines, server-derived prices
  checkout/create-checkout.ts     snapshot -> reserve -> Stripe session
  orders/queries.ts               order reads from immutable snapshots
  db/commerce-rpc.ts              the SECURITY DEFINER RPC boundary
```

Rules that hold across this layer:

- **Availability is resolved in exactly one place.** `resolveSellableQuantities()` — so a
  bundle can never look sellable on the product page and unsellable in the cart.
- **Prices are never accepted from a client.** `cart_items` stores only variant and
  quantity; the price is read fresh and frozen only into the checkout snapshot.
- **Pre-checks are not guarantees.** Availability checks in TypeScript are fast rejections.
  Oversell protection is `reserve_checkout_inventory`, which takes row locks.
- **Catalog and order reads run on the service-role client**, which bypasses RLS, so each
  function lists its columns explicitly and is responsible for leaking nothing. Never
  `select("*")` on a table that has cost, credential or internal columns.
- **No fabricated values.** Flat shipping has no default: checkout fails loudly with
  `MissingSettingError` until the owner configures it.
- **Failed checkout creation releases its reservation** rather than stranding stock.

---

## Storefront (Phase 2)

```
src/components/
  ui/logo.tsx              Monogram (locked artwork) + Wordmark. NEVER reconstruct the mark.
  ui/media-slot.tsx        Every editorial image. Renders a placeholder until Studio fills it.
  storefront/site-header.tsx   Locked global component
  storefront/site-footer.tsx   Locked global component
  storefront/product-card.tsx  Price from commerce data, availability from stock state
  storefront/variant-picker.tsx  Client. Sold-out variants disabled but legible
  storefront/cart-lines.tsx      Client. Mutations go through Server Actions
  sections/                Section renderers, one per registered section_type
src/lib/cms/
  sections.ts              Typed section payloads + MediaSlot/CTA field types
  default-home.ts          Default Homepage 3.0 content — the Phase 4 seam
```

Rules that hold across the storefront:

- **The homepage renders from typed section payloads, not JSX literals.** Phase 4
  replaces the `DEFAULT_HOME_SECTIONS` import with a `page_sections` read and the
  renderers do not change. `renderSection` is exhaustive, so adding a section type
  without a renderer is a compile error rather than a blank page.
- **Every image is a `MediaSlot`.** Asset id, alt text, and independent desktop and
  mobile focal points. Final photography drops in from Studio with no code change.
  Never a CSS background, never a baked-in mockup.
- **Optional product surfaces degrade; commerce surfaces do not.** `safeCatalogRead`
  lets a product rail render nothing when the catalog is unreachable, so the brand
  page survives an outage. Never wrap a cart, checkout, inventory or order read in it —
  and a PDP catalog failure rethrows rather than rendering a misleading 404.
- **The display serif needs `lnum`.** Without lining figures forced in the theme,
  "ERA 00" renders as "ERA oo".
- Newsletter signup belongs to the footer only. The `newsletter` section type stays
  registered for other pages.
- Social links are owner-owed. Do not invent handles to fill the footer.

## Studio (Phase 3)

```
src/components/studio/
  nav.ts                   Navigation model + active-route matching
  studio-nav.tsx           Client. Desktop rail, mobile drawer
  top-bar.tsx              Environment + save state
  primitives.tsx           PageHeader, Panel, StatusChip, EmptyState, LoadError
  product-form.tsx         Client. Product fields
  variant-editor.tsx       Client. Variant fields (never quantity)
  inventory-table.tsx      Client. Audited +/- and absolute set
  media-library.tsx        Client. Upload, alt text, archive
src/lib/studio/
  dashboard.ts             Real-record summaries only
  products.ts   product-types.ts    server read / client-safe split
  inventory.ts  inventory-actions.ts
  media.ts      media-types.ts  media-actions.ts
  product-actions.ts
```

Rules that hold across Studio:

- **A `server-only` module may never be imported by a Client Component**, not even
  for a helper. Each server module has a `*-types.ts` sibling holding the shapes
  and pure helpers; the client imports that. Importing a runtime value across
  that line is a build failure, which is the guard working.
- **A failed read renders as a failure, never as a zero.** `LoadError` exists so
  the owner never acts on a fabricated "0 orders" that is really a broken query.
- **Quantity is never a form field.** Product and variant forms edit labels,
  price and policy; stock changes only through `studio_adjust_inventory`, which
  re-verifies ownership in PostgreSQL and writes an append-only movement.
- **Authorization is checked twice**: `requireStudioOwner()` in the action for a
  clean message, and again inside the RPC as the real boundary.
- **Archive over delete.** Media archiving is refused while an asset is still
  referenced; variants deactivate rather than delete so order history survives.
- Owner-facing mode labels ("I stock this") are primary; the enum is metadata.
- Studio never displays a third party as "connected" — only whether BAD ERA has
  it *configured*, which is checkable without asserting something unverified.

## Site Editor (Phase 4)

```
src/lib/cms/
  registry.ts          Zod schemas + inspector definitions per section_type
  pages.ts             Draft/published revision reads
  page-actions.ts      Autosave, publish, rollback
  default-home.ts      Fallback only — the database is now the source
src/components/
  sections/render.tsx  The ONE renderer, shared by the page and the preview
  studio/site-editor.tsx  Three-pane shell, autosave, publish
  studio/inspector.tsx    Schema-generated fields
```

Rules that hold across the editor:

- **The inspector has exactly six field kinds**: text, textarea, media, cta,
  productList, repeater. There is no colour, font, size, spacing, CSS or HTML
  field, and that absence *is* the guardrail. `tests/unit/section-registry.test.ts`
  fails the build if a seventh kind appears.
- **A draft is always a separate revision.** Migration `0006` triggers reject any
  update to a published revision or its sections, so publishing is a state flip
  on the draft, never an edit of live content. Verified against the live
  database: a direct `UPDATE` on the live revision is rejected.
- **Publishing validates every section first.** If any fails, nothing is written
  and live keeps serving the previous revision.
- **Rollback republishes an old revision as a NEW one.** History is append-only.
- **The preview renders through `renderSections`, the same function the public
  page uses.** A preview that renders through a different path is a preview that
  lies. It is owner-gated and `force-dynamic` so draft content never reaches the
  public cache.
- **The homepage falls back to `DEFAULT_HOME_SECTIONS` when the published read
  fails.** `next build` prerenders that page, and a build that fails when the
  database is down cannot ship a hotfix. The failure is logged loudly.

## Build phases

Work **one phase at a time**. Write a short plan for the current phase only. Never attempt
every phase in one uncontrolled pass.

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundation: Next.js/TS/Tailwind, design tokens, Supabase migrations, auth skeleton, env validation, route shells | **Complete** |
| 1 | Commerce core: products, variants, inventory, cart, Stripe Checkout, verified webhooks, order snapshots | **Complete** (domain layer; awaiting live credentials for an end-to-end Stripe run) |
| 2 | Public storefront: Home, Shop All, PDP, cart, responsive | **Complete** (renders against a live catalog; awaiting database credentials for an end-to-end pass) |
| 3 | Studio core: shell, dashboard, media library, product/variant/inventory editors, authorization | **Complete** (awaiting an owner account for a visual pass) |
| 4 | Site Editor: section registry, three-pane editor, autosave, preview, publish integration | **Complete** (awaiting an owner session for a visual pass) |
| 5 | Orders & customers: accounts, addresses, order history, Studio workspaces | Not started |
| 6 | Fulfillment: Providers, Inventory & Fulfillment panel, Manual Supplier, Action Required recovery | Not started |
| 7 | Returns / refunds / support | Not started |
| 8 | Publishing / version control | Not started |
| 9 | Hardening: security headers, MFA, rate limits, observability, a11y, SEO, performance, backups | Not started |
| 10 | Full QA / launch readiness — **stop and report; do not launch publicly** | Not started |

Keep this table current as phases complete.

After each phase: run lint / typecheck / tests / build and report **exact** results. For UI
phases, capture desktop and mobile screenshots and compare against the references in
`brand/reference/` (see `brand/ASSET_MAP.md`).

---

## Verification

```sh
npm run verify   # lint -> typecheck -> test -> build
```

Run it before every commit, and report **exact** results after each phase. Builds must stay
hermetic: `next build` must succeed with no secrets present. That is why Stripe is
constructed lazily per-request and why the Studio segment is `force-dynamic`.

---

## Working rules

- Inspect the existing repo, `package.json`, routes, migrations and env conventions before
  changing code. Preserve working infrastructure unless the spec requires replacement.
- Use migrations for every schema change. Never depend on undocumented production DB state.
- Do not hard-code copy or images that Studio is supposed to manage.
- Do not call privileged RPCs from browser code.
- Do not widen anonymous DB access to simplify a storefront query — use a server read.
- When a requirement is ambiguous, choose the option that preserves data integrity, owner
  editability, responsive elegance and future extensibility — then document the assumption.
- Do not launch publicly. Stop at launch-readiness and hand the owner the remaining
  environment and content tasks.
- Seed data must be obviously replaceable and non-authoritative.

---

## Deferred — approved, but not in v1

Lookbook (dark luxury campaign journal) · ERA 00 collection landing · BE FRAME 00 "GLIM"
eyewear · Rollo Wireless label printing · supplier API automation · advanced Studio staff
roles · live carrier rates.

Keep the content and catalog models extensible for these. Do not build them.

Candidate providers under evaluation (**not** dependencies, and only after physical sample
validation): Apliiq, Printful, Printify, an eyewear OEM/dropship supplier. BAD ERA STOCK is
the native internal provider and is always supported.

---

## Open items the owner still owes

- Exact Archive 01 physical counts: Tee S/M/L, Crossbody Black/Red/Blue
- Final production photography for every slot (see the handoff checklist in master spec §23.1)
- Flat shipping amount
- Stripe live keys + webhook endpoint; Supabase production project; Resend verified domain
- Product copy: descriptions, materials, care, fit
- Policy and legal language; social links; newsletter configuration

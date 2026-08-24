# BAD ERA — launch readiness

Phase 10 QA. **The site has not been launched.** This is the assessment and the
handoff list.

Date of audit: 2026-08-24
Branch: `claude/festive-cray-354clx`

---

## Verdict

**Not ready to launch, and the remaining work is almost entirely yours, not code.**

Every engineering phase (0–9) is complete and verified. What blocks launch now is
configuration and content that only the owner can supply: live payment
credentials, the flat shipping amount, real inventory counts, policy wording and
photography. None of it can be invented without fabricating a commitment BAD ERA
has not made.

One thing has never been exercised: **no page has ever rendered against the live
database, and no real payment has ever been taken.** The sandbox this was built
in cannot reach `snkvgpfpnphvbkiafptd.supabase.co` — outbound CONNECT returns
403. The schema is verified directly against the live project, and the commerce
guarantees are proven against real PostgreSQL, but the end-to-end path
(browse → cart → checkout → Stripe → webhook → order) has only ever run in
pieces. **Do not launch before running it once end to end in test mode.**

---

## What Phase 10 found and fixed

QA found the storefront's navigation was substantially broken. These were real
defects, not missing features, and they are fixed:

| Finding | Severity | Status |
|---|---|---|
| `/checkout` did not exist — the cart's Checkout button dead-ended. **Purchase was impossible.** | Blocker | Fixed: checkout page + form built |
| `/api/checkout/create` accepted `cartId` from the request body — a caller could check out someone else's cart, reserving their stock | Security | Fixed: cart id now resolved from the session cookie; anything sent under `cartId` is discarded |
| Footer linked to `/about`, `/privacy`, `/terms`, `/shipping`, `/returns-policy` — **all five 404'd** | Blocker | Fixed: five routes built, Studio-managed |
| `/checkout/success` was a placeholder — the page a customer lands on after paying | Blocker | Fixed: reads verified order state, shows an honest "being confirmed" state until the webhook lands |
| `/checkout/cancelled` was a placeholder | Major | Fixed |
| `/support` was a placeholder | Major | Fixed |
| `sitemap.xml` advertised six URLs that did not exist (introduced in Phase 9) | Major | Fixed: information pages listed only once published |
| Six API routes returned 501, superseded by Server Actions | Cleanup | Removed |
| `/collections/[handle]` stub, not in the v1 IA and linked from nowhere | Cleanup | Removed |
| `PREVIEW_SECRET`, `notImplemented`, `RouteShell` left dead | Cleanup | Removed |

### Deliberately NOT fixed by inventing content

The five information pages render from the CMS and show an honest "not published
yet" message with a route to support. They do **not** ship placeholder legal
text. Privacy, terms, shipping and returns wording are legally binding
statements about how a real business handles real money and real data — a
customer could rely on placeholder wording, and BAD ERA would be bound by words
nobody at BAD ERA wrote.

Write them in Studio → Site Editor. A `legal.prose` section type was added for
exactly this (heading, sub-line, body; plain text, no markup field).

---

## Verified

| Check | Result |
|---|---|
| `npm run verify` (lint → typecheck → test → build) | Pass. 179 unit tests. Build hermetic — succeeds with no secrets present |
| Commerce acceptance matrix (`db:acceptance`) | **12/12** against real PostgreSQL 16 |
| Schema invariants (`db:verify`) | 62 tables · 62 RLS · 62 owner policies · **0 anon table grants** · 0 SECURITY DEFINER without fixed `search_path` |
| Migration chain `0001 → 0014` | Replays clean from scratch |
| Live Supabase security advisors | 1 remaining, and it is an owner toggle (see below) |
| Every internal link resolves | Pass — all footer, header, cart and account destinations return 200/307 |
| CSP nonce coverage | 100% of script tags on every public page, 404s included |
| Horizontal overflow, 390px and 1440px | None on any page |
| Accessibility (h1, landmark, alt text, labelled inputs, skip link, lang) | Pass. `/sign-in` has no skip link, which is correct — it has no nav to skip |
| Brand lock | Monogram rendered from the owner-supplied asset (1254×1254, aspect preserved), never reconstructed |
| ARCHIVE 01 contract | Tee S/M/L only · $30.00 / $25.00 / $45.00 · no 2XL anywhere · no sale/clearance/urgency language anywhere |
| Secret hygiene | No real credential in any tracked file. `.env` and `.env*.local` ignored |

### Accepted, not defects

- **17 "multiple permissive policies" warnings.** Every one is the intended
  pattern: a customer policy and the Studio owner policy coexist on the same
  table for `authenticated`, because the owner is also an authenticated user.
  Both must exist.
- **92 unindexed foreign keys / 26 unused indexes** (INFO). Meaningless at zero
  traffic — "unused" simply means nothing has run yet. Revisit after real
  order volume, and index the FKs that show up in slow queries rather than all
  92 speculatively.

---

## Blocking: what only you can do

### 1. Credentials and configuration

- [ ] **Stripe live keys** — `STRIPE_SECRET_KEY`, and a webhook endpoint
      pointed at `/api/webhooks/stripe` with its `STRIPE_WEBHOOK_SECRET`
- [ ] **Flat shipping amount.** Checkout deliberately fails loudly with
      `MissingSettingError` until this is set — there is no default, because a
      guessed shipping price is a fabricated promise
- [ ] **Resend** verified sending domain + `RESEND_FROM_EMAIL`
- [ ] **`NEXT_PUBLIC_SITE_URL`** set to the real domain (Stripe redirect URLs
      and the sitemap derive from it)

### 2. Security (the three from Phase 9)

- [ ] **Point-in-Time Recovery** on Supabase, and one rehearsed restore
      (`docs/runbooks/backup-and-restore.md`). Daily backups alone mean up to
      24h of lost orders while Stripe still holds the payments
- [ ] **Leaked-password protection** — Supabase dashboard → Auth → Passwords.
      A project toggle; no migration can set it. This is the one remaining
      security advisory
- [ ] **Enrol a TOTP authenticator** — Studio → Settings → Security. The MFA
      gate is inert by design until you do

### 3. Rotate the service-role key

The service-role key was pasted into a chat transcript during this build. It
bypasses Row Level Security entirely. **Rotate it** in the Supabase dashboard
and update the Vercel environment variable.

### 4. Content

- [ ] Archive 01 physical counts: Tee S/M/L, Crossbody Black/Red/Blue. Enter in
      Studio → Inventory. The seed contains test quantities and is marked
      `DEVELOPMENT SEED ONLY` — do not load it into production
- [ ] Product copy: descriptions, materials, care, fit
- [ ] Policy wording for `/privacy`, `/terms`, `/shipping`, `/returns-policy`,
      and the `/about` page
- [ ] Final photography for every media slot. Replacing a placeholder requires
      zero code changes — upload in Studio → Media and assign the slot
- [ ] Social links (the footer does not invent handles)
- [ ] Newsletter configuration — the footer field currently reads "SOON"

---

## Before you flip the switch

Run this once, in Stripe **test mode**, against the live database:

1. Browse the storefront, add a tee and a crossbody to the cart
2. Add the Original Era Set bundle as well, to exercise the component decrement
3. Complete checkout with a Stripe test card
4. Confirm the webhook fires and the order appears in Studio → Orders
5. Confirm inventory decremented for the exact variants, including the bundle's
   components
6. Confirm the confirmation email arrives
7. Ship it from Studio → Fulfillment, add tracking, confirm the customer sees it
8. Request a return, approve, refund, and restock — confirm all three are
   independent

Then repeat step 3 with a card that fails, and confirm the reservation is
released rather than stranded.

If any step fails, that is a bug to fix before launch, not after.

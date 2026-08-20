# Phase 1 — Commerce core: completion report

Scope per Master Spec §21: *"Products, variants, inventory, cart, Stripe Checkout creation,
verified/idempotent webhooks, order snapshots, payment state."*

Also closes the Kickoff v0.3 workstreams for database types, repositories, commerce-RPC
implementation and checkout creation.

## Verification results

```
npm run lint          clean — 0 errors, 0 warnings
npm run typecheck     clean
npm test              48 passed (3 files)
npm run build         success — 32 routes
npm run db:verify     ALL SECURITY INVARIANTS PASS
npm run db:acceptance 10 of 15 matrix cases passing (see below)
```

## Acceptance matrix

`tests/integration/sql/` now exercises the commerce guarantees directly against PostgreSQL,
which is where they actually live — atomicity, idempotency and oversell protection are
enforced by the RPCs, not by TypeScript.

| # | Case | Result |
|---|---|---|
| 1 | Two concurrent reservations for the last unit — exactly one succeeds | **PASS** |
| 2 | Repeating `reserve_checkout_inventory` is a no-op | **PASS** |
| 3 | `checkout.session.expired` releases stock exactly once | **PASS** |
| 4 | Unpaid delayed method holds the reservation instead of releasing | **PASS** |
| 5 | `async_payment_succeeded` converts and decrements exactly once | **PASS** |
| 6 | `async_payment_failed` releases the payment-pending reservation | **PASS** |
| 7 | Duplicate paid events return the same order, no duplicate items | **PASS** |
| 8 | Bundle S/Blue decrements Tee/S and Crossbody/Blue, never a bundle pool | **PASS** |
| 9 | Manual Supplier creates a supplier task with no internal decrement | **PASS** |
| 15 | Published page revisions remain immutable | **PASS** |
| 10 | Mixed cart produces independent fulfillment groups | deferred — Phase 6 |
| 11-13 | RLS enforcement per role | deferred — needs real Supabase JWTs |
| 14 | Stripe signature verification against a mutated body | deferred — needs live keys |

Case 1 runs as a separate script because it needs two concurrent connections. It stages the
Tee/L pool down to a single unit and races two reservations; one wins, the other receives
`insufficient inventory for variant …: need 1, available 0`, and the pool lands at 0.

## A second blocking defect

Phase 0 found and fixed one. Running the full matrix surfaced another, equally severe.

`release_checkout_inventory` wrote:

```sql
set status = case when p_checkout_status = 'expired' then 'expired' else 'released' end
```

into `inventory_reservations.status`, which is the `reservation_status` enum. A `CASE` whose
branches are untyped string literals resolves to `text`, and PostgreSQL will not implicitly
assign text to an enum column. **Every call raised.**

That function is the only path that returns reserved stock. With it failing:

- `checkout.session.expired` could not release an abandoned checkout
- `checkout.session.async_payment_failed` could not release a failed payment
- `release_expired_checkout_inventory` could not sweep

Every abandoned or failed checkout would have stranded its units permanently. Available
would ratchet down until the storefront showed SOLD OUT while the physical goods sat on the
shelf — with no error visible to a customer, and nothing in Studio explaining it.

Fixed in migration `0011` by casting the `CASE` result to the enum. Migration `0008` already
uses explicit enum casts elsewhere (`'accepted'::public.fulfillment_group_status`); this call
site was simply missed.

Neither `0010` nor `0011` is catchable by static analysis: both are valid SQL that only fails
on execution. Both required actually running the code.

## Built

**`src/lib/db/commerce-rpc.ts`** — the v0.2 placeholder is now real. Every function calls a
narrow SECURITY DEFINER routine through the service-role client and parses the result
strictly. The TypeScript layer deliberately adds no retries, pre-checks or splitting:
atomicity belongs to the database. Also exports `reserveCheckoutInventory` and
`releaseExpiredCheckoutInventory`.

**`src/lib/inventory/availability.ts`** — pure, dependency-free rules: `floor(min(aᵢ / qᵢ))`
bundle math, the four stock-message thresholds, and quantity clamping. `null` means
unbounded, never zero — an untracked or continue-selling variant must not be mistaken for
sold out. 27 unit tests, including the Archive 01 cases from §14.3.5.

**`src/lib/catalog/availability-lookup.ts`** — the single place sellable quantity is
resolved, so a bundle cannot look sellable on the product page and unsellable in the cart. A
bundle referencing a missing component resolves to 0, never to "unknown, therefore fine".

**`src/lib/catalog/queries.ts`** — customer-safe product and variant projections with
explicit column lists, so a future cost or credential column cannot leak by being swept up
in `select("*")`.

**`src/lib/cart/service.ts`** — `cart_items` stores only variant and quantity. Prices are
read fresh on every hydrate, so a Studio price change is reflected immediately and is frozen
only into the checkout snapshot. Adding to cart never reserves or decrements stock. Lines
whose product was archived surface as blocking rather than silently disappearing.

**`src/lib/checkout/create-checkout.ts`** — the locked invariant end to end: validate the
cart server-side → write `checkout_sessions` + `checkout_lines` + `checkout_line_components`
→ `reserve_checkout_inventory()` → create the Stripe session. Bundles resolve to physical
components in the snapshot. The Stripe call carries an idempotency key derived from the
checkout id, and the session expiry is pinned to the reservation window. If anything after
the reservation fails, the reservation is released rather than stranded.

**`src/lib/settings/store.ts`** — typed `site_settings` access. Flat shipping has **no
default**: `getFlatShippingCents()` throws `MissingSettingError` until the owner configures
it. Inventing a shipping price would be a fabricated shipping promise (§22).

**`src/lib/orders/queries.ts`** — order reads from immutable snapshots, never from current
product records. Bundles keep their component breakdown so packing and returns stay
unambiguous. Customers see carrier and tracking; provider identity and cost stay internal.

**`POST /api/checkout/create`** — wired, with distinct handling for customer-actionable
errors (400/409), store misconfiguration (503, logged loudly, generic customer message) and
everything else (500, nothing leaked).

**Type generator** — extended to emit real `Functions` signatures, so `db.rpc()` is
typechecked. Arguments are nullable on input because PostgreSQL accepts NULL for any
parameter; only arguments with a DEFAULT are optional.

## Not done, and why

- **No storefront UI.** Cart and product pages are Phase 2. This phase is the domain layer
  beneath them; the route shells still render Phase 0 stubs.
- **No end-to-end Stripe run.** That needs live test keys and a `stripe listen` tunnel.
  Everything up to the Stripe call is verified; the orchestration itself has 9 unit tests
  over an injected RPC boundary.
- **Cases 10-14** need either a running Supabase with real JWTs (RLS per role) or live Stripe
  keys (signature verification). Both are credential-blocked, not code-blocked.

## Blocked on you

**The Supabase project could not be created.** Supabase rejected it:

> The following organization members have reached their maximum limits for the number of
> active free projects: dasanches007-byte (2 project limit).

Only one project ("Out Of Sight Market") and one organization are visible to this session's
token, so the second free project counting against the limit is somewhere I cannot see —
possibly an organization this token isn't scoped to. Resolving it needs your account:

1. Pause or delete an unused free project at supabase.com/dashboard, then I can create it, or
2. Upgrade the organization, or
3. Create a project named "BAD ERA" yourself and send me the URL and publishable key.

Once it exists I can apply migrations `0001-0011` and regenerate types directly. The
service-role key and the Stripe keys stay yours to add to `.env.local` — nothing in the
codebase needs them until runtime.

Also still owed, from the Phase 0 list: the flat shipping amount (checkout is blocked
without it, by design) and the exact Archive 01 counts.

# Phase 0 — Foundation: completion report

Scope per Master Spec §21: *"Repository baseline, Next.js/TypeScript/Tailwind, design
tokens, Supabase project/schema/migrations, auth skeleton, environment validation, route
shells. Do not build decorative pages before data foundations exist."*

## Verification results

```
npm run lint       clean — 0 errors, 0 warnings
npm run typecheck  clean — tsc --noEmit, 0 errors
npm test           21 passed (2 files)
npm run build      success — 32 routes
```

Database, against PostgreSQL 16.13:

```
migrations 0001-0010   all applied OK
seed.sql               OK
db:verify              tables=62  rls=62  owner_policies=62  anon_grants=0
                       bad_era_functions=18  security_definer=10
                       ALL SECURITY INVARIANTS PASS
smoke test             PASS — acceptance cases 7 and 8
```

## The migrations had never been executed

Kickoff v0.2 shipped with a static validation pass and this caveat:

> Static validation does not replace running the migrations against a real local
> Supabase/PostgreSQL instance. That runnable environment is an explicit v0.3 task.

Since no hosted Supabase project exists, `scripts/local-db.sh` stands up a local
PostgreSQL 16 cluster with `scripts/supabase-shim.sql` supplying the platform objects
Supabase would normally provide (the `auth` schema, `auth.uid()`, and the `anon` /
`authenticated` / `service_role` roles).

All nine delivered migrations applied cleanly. Every security claim in the static
validation held up against the live database.

### One blocking defect found

`convert_paid_checkout` — the single atomic paid-order conversion — failed on **every**
call:

```
ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

`public.payments` carries a **partial** unique index:

```sql
payments_external_intent_unique_idx UNIQUE (external_payment_intent_id)
  WHERE external_payment_intent_id IS NOT NULL
```

Migration `0008` wrote `on conflict (external_payment_intent_id) do nothing`. PostgreSQL
only infers a partial index as a conflict arbiter when the statement repeats the index
predicate, so the clause matched nothing and raised.

Impact: the exception aborted the whole conversion transaction. No verified Stripe payment
could ever produce a BAD ERA order. Inventory would stay reserved, the webhook would return
5xx, and Stripe would retry forever against a permanently failing handler.

Static analysis cannot catch this — the SQL is syntactically valid and the index does exist.
It only appears on execution.

**Fix:** migration `0010` recreates the function with the predicate repeated. Behaviour is
otherwise identical and replayed Stripe events remain idempotent. Migrations `0001-0009` are
left byte-identical so the delivered package still matches its published SHA-256 checksums.

### Acceptance cases proven

`tests/integration/sql/smoke_bundle_conversion.sql` (repeatable — generates unique Stripe
identifiers per run):

- **Case 8** — a paid Original Era Set (M + Blue) decrements Tee/M by 1 and Crossbody/Blue
  by 1. No stock row exists for the bundle variant. The order carries one customer-facing
  line, `Original Era Set / M / Blue`, with component truth persisted internally as
  `Original Tee / M x1, Original Crossbody / Blue x1`.
- **Case 7** — replaying the same paid conversion returns the same order id and creates no
  duplicate items or movements.

The ledger records the two-phase model correctly: `checkout_reserve` commits without
touching on-hand (`delta_on_hand=0, delta_committed=+1`), then `order_sale` decrements
on-hand and releases the commitment.

The seed matches the Archive 01 contract: Tee S/M/L, Crossbody Black/Red/Blue, and the
bundle holding **0** stock of its own across 9 combinations with 18 component rows.

## Built

**Design tokens** — `src/app/globals.css`. Tailwind v4 CSS-first `@theme`: near-black
surfaces with warm-black variation, bone/ivory ink, stone accent, hairline borders,
desaturated semantic states, a fluid editorial display scale, tracked uppercase utility
labels, cinematic spacing and slow motion easings. Locked hero/card overlay gradients the
Site Editor may not change. `prefers-reduced-motion` honoured; visible focus rings.

**Environment validation** — `src/lib/env/server.ts` (guarded by `server-only`, validated
lazily so builds stay hermetic) and `src/lib/env/public.ts`. `serverEnvStatus()` supports
the Studio integration-health panel without ever revealing a secret value.

**Supabase clients** — `client.ts` (browser, auth flows only — `anon` has no table grants),
`server.ts` (request-scoped, RLS applies), `admin.ts` (service-role, bypasses RLS,
`server-only` plus a runtime browser guard).

**Generated types** — `src/lib/db/generated.types.ts`, 62 tables / 36 enums / 133 foreign
keys, produced from the validated schema by `scripts/gen-types.mjs`. The official CLI needs
Docker, which is not reliably available here; the generator needs only `psql`. The output
shapes are interchangeable, and these types immediately caught a real bug — `studio_users`
is keyed by `user_id`, not `id`.

**Studio authorization** — `src/lib/auth/studio.ts`. Authority comes from `studio_users`,
never from JWT `user_metadata`. Uses `getUser()` (revalidates the JWT), not `getSession()`.
V1 authorizes `owner` only, behind an explicit role set that widens deliberately.

**Auth** — PKCE callback with open-redirect protection, extracted to
`src/lib/auth/safe-redirect.ts` and unit tested against 8 hostile inputs.

**Middleware** — session refresh plus `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`, `Permissions-Policy`, and `X-Robots-Tag: noindex` on Studio and preview.
The Stripe webhook path is excluded so its raw body is never touched.

**Route shells** — all 32 v1 routes from the locked folder tree. Storefront uses `[handle]`
to match the schema column and the kickoff package, which is authoritative for folder
boundaries.

## Boundaries verified at runtime

| Check | Result |
|---|---|
| `/studio` unauthenticated | 307 → `/` |
| `/studio/orders` unauthenticated | 307 → `/` |
| `POST /api/studio/inventory/adjust` | 403 `forbidden` |
| `POST /api/studio/publish` | 403 `forbidden` |
| `POST /api/webhooks/stripe` no signature | 400 |
| `POST /api/webhooks/stripe` bad signature | 400 |
| `X-Robots-Tag` on `/studio` | `noindex, nofollow` |
| Security headers on storefront | all present |

## Two upstream fixes beyond migration 0010

1. **`src/app/api/webhooks/stripe/route.ts`** constructed Stripe at module scope with
   `process.env.STRIPE_SECRET_KEY!`. Next.js evaluates route modules during page-data
   collection, so `next build` failed outright without secrets — breaking CI, fresh clones
   and preview deploys. Moved to a lazy per-request client in
   `src/lib/payments/stripe/client.ts`. Webhook semantics are unchanged: raw body via
   `request.text()`, then `constructEvent`.

2. **Studio segment** is now `force-dynamic`. It was being statically prerendered, which is
   wrong for per-user authenticated software regardless of the build failure it caused.

## Deferred to later phases

- `src/lib/db/commerce-rpc.ts` remains a throwing placeholder — the v0.2 application
  boundary. Phase 1 implements it against the service-role client with result validation.
- Storefront header/footer, Studio navigation rail and top bar — Phases 2 and 3.
- Remaining acceptance matrix cases (concurrency, mixed cart, manual supplier, RLS
  enforcement per role) need a running Supabase with real JWTs — Phase 1 onward.
- Resend, preview signing and CSP — Phases 4, 7 and 9.

## Blocked on the owner

No hosted Supabase project exists. The only project on the account, "Out Of Sight Market",
is unrelated and was deliberately left untouched. A BAD ERA project is needed before Phase 1
can wire real credentials — along with Stripe test keys and a webhook secret.

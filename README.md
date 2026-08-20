# BAD ERA 2.0

Storefront + BAD ERA Studio. A premium dark-luxury commerce platform built on Next.js,
Supabase and Stripe.

**Start with [`CLAUDE.md`](./CLAUDE.md)** — it is the condensed build contract and the first
thing to read in any session.

## Repository layout

```
CLAUDE.md                  Condensed build contract — read first
brand/
  ASSET_MAP.md             Every visual, its classification and its rules
  logo/                    Official locked identity artwork (full resolution)
  reference/               Approved structural, product, deferred and campaign references
docs/
  source/                  Original owner documents — authoritative
  spec/                    Extracted searchable text of both specifications
architecture/              Architecture contract, security contract, folder tree
supabase/
  migrations/              0001…0011 — apply strictly in order
  schema.combined.sql      Full combined schema (62 tables)
  seed.sql                 DEVELOPMENT DATA ONLY
src/app/(storefront)/      Public storefront route shells
src/app/studio/            Studio route shells (owner-gated, force-dynamic)
src/app/api/               Checkout, webhooks, Studio mutations, preview
src/lib/env/               Server + public environment validation
src/lib/inventory/         Pure availability rules (bundle math, stock states)
src/lib/catalog/           Availability lookup + customer-safe catalog reads
src/lib/cart/              Cart service, server-derived prices
src/lib/checkout/          Durable snapshot, reservation, Stripe session
src/lib/orders/            Order reads from immutable snapshots
src/lib/settings/          Typed site_settings access
src/lib/db/                Supabase clients (browser / session / service-role) + generated types
src/lib/auth/              Studio authorization, safe redirect
src/lib/fulfillment/       Provider-agnostic adapter contract, registry, first two providers
src/lib/checkout/          Stripe event orchestration
scripts/                   Local PostgreSQL harness, security verifier, type generator
tests/unit/                Vitest unit tests
tests/integration/         Acceptance matrix + SQL acceptance tests
validation/                Static validation results and package checksums
package-manifest.json      Kickoff v0.2 package manifest
```

## Current state

**Phases 0 and 1 complete.**

Phase 0 laid the foundation: Next.js 16 App Router + TypeScript + Tailwind v4, BAD ERA
design tokens, environment validation, the three Supabase clients, Studio authorization,
security headers and all 32 v1 route shells.

Phase 1 built the commerce core: the atomic commerce RPC boundary, bundle-aware availability,
catalog and cart services, durable checkout snapshots, Stripe Checkout creation, and order
reads from immutable snapshots.

The schema runs end to end against PostgreSQL 16 and 10 of the 15 acceptance cases pass,
including the last-unit race and bundle conversion. Executing it surfaced **two blocking
defects** in the delivered package, both invisible to static analysis — fixed in migrations
`0010` and `0011`. See `docs/PHASE_0_REPORT.md` and `docs/PHASE_1_REPORT.md`.

Next: Phase 2 — the public storefront.

## Getting started

```sh
npm install
cp .env.example .env.local     # fill in Supabase + Stripe values
npm run dev
```

There is no hosted Supabase project yet. To validate the schema locally:

```sh
npm run db:start        # PostgreSQL on :5433, migrations + seed
npm run db:verify       # assert the security invariants
npm run db:acceptance   # run the v0.2 acceptance matrix
npm run verify          # lint -> typecheck -> test -> build
```

## Verifying the build package

```sh
cd docs/source && unzip -q BAD_ERA_Claude_Build_Kickoff_v0.2.zip \
  && cd BAD_ERA_Claude_Build_Kickoff_v0_2 && sha256sum -c validation/checksums.sha256
```

All 29 files verified at import time. Migrations `0001-0009` remain byte-identical to the
delivered package.

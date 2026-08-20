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
  migrations/              0001…0010 — apply strictly in order
  schema.combined.sql      Full combined schema (62 tables)
  seed.sql                 DEVELOPMENT DATA ONLY
src/app/(storefront)/      Public storefront route shells
src/app/studio/            Studio route shells (owner-gated, force-dynamic)
src/app/api/               Checkout, webhooks, Studio mutations, preview
src/lib/env/               Server + public environment validation
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

**Phase 0 complete.** Next.js 16 App Router + TypeScript + Tailwind v4, BAD ERA design
tokens, environment validation, the three Supabase clients, the Studio authorization
skeleton, security headers and all 32 v1 route shells.

The 62-table schema has been executed end to end against PostgreSQL 16 and every security
invariant verified against the live database — the first time the migrations have actually
been run. Doing so surfaced one blocking defect in `convert_paid_checkout`, fixed in
migration `0010`.

`src/lib/db/commerce-rpc.ts` is still intentionally a throwing placeholder marking the v0.2
application boundary. Implementing it against the server-only Supabase client is Phase 1.

Next: Phase 1 — commerce core. See the phase table in `CLAUDE.md`.

## Getting started

```sh
npm install
cp .env.example .env.local     # fill in Supabase + Stripe values
npm run dev
```

There is no hosted Supabase project yet. To validate the schema locally:

```sh
npm run db:start     # PostgreSQL on :5433, migrations + seed
npm run db:verify    # assert the security invariants
npm run verify       # lint -> typecheck -> test -> build
```

## Verifying the build package

```sh
cd docs/source && unzip -q BAD_ERA_Claude_Build_Kickoff_v0.2.zip \
  && cd BAD_ERA_Claude_Build_Kickoff_v0_2 && sha256sum -c validation/checksums.sha256
```

All 29 files verified at import time. Migrations `0001-0009` remain byte-identical to the
delivered package.

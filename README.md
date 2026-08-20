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
  migrations/              0001…0009 — apply strictly in order
  schema.combined.sql      Full combined schema (62 tables)
  seed.sql                 DEVELOPMENT DATA ONLY
src/lib/fulfillment/       Provider-agnostic adapter contract, registry, first two providers
src/lib/checkout/          Stripe event orchestration
src/app/api/webhooks/      Stripe webhook route handler
tests/integration/         Acceptance matrix
validation/                Static validation results and package checksums
package-manifest.json      Kickoff v0.2 package manifest
```

## Current state

Kickoff v0.2 is committed: the 62-table schema, atomic commerce RPCs, RLS security layer,
Stripe webhook orchestration and the fulfillment provider contract.

The Next.js application itself has **not** been scaffolded yet. That is Phase 0. See the
phase table in `CLAUDE.md`.

`src/lib/db/commerce-rpc.ts` is intentionally a throwing placeholder marking the v0.2
application boundary — implementing it against the server-only Supabase client is a v0.3
task.

## Verifying the build package

```sh
cd docs/source && unzip -q BAD_ERA_Claude_Build_Kickoff_v0.2.zip \
  && cd BAD_ERA_Claude_Build_Kickoff_v0_2 && sha256sum -c validation/checksums.sha256
```

All 29 files verified at import time.

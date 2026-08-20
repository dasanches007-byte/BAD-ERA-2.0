# BAD ERA — Claude Build Kickoff Package v0.2

This package supersedes Kickoff v0.1 and continues implementation from BAD ERA Master Product & Engineering Specification v1.9.

## v0.2 locks the executable commerce/security layer
- all v0.1 application architecture and 59-table baseline;
- durable checkout snapshots so Stripe never depends on mutable cart/catalog state after redirect;
- 62-table schema total after checkout snapshot tables;
- atomic internal inventory reservation/release/paid conversion PostgreSQL RPCs;
- atomic Studio inventory adjustment RPC;
- Stripe webhook event claiming/deduplication;
- exact Next.js App Router Stripe webhook flow using the raw request body;
- delayed payment success/failure and Checkout expiration behavior;
- exact Supabase RLS policies for customer ownership and Studio owner access;
- no anonymous PostgreSQL Data API access for the storefront;
- TypeScript fulfillment-provider adapter contract, registry, BAD ERA Stock provider and Manual Supplier provider;
- critical integration-test acceptance cases.

## Migration order
Apply in order:
`0001` → `0002` → `0003` → `0004` → `0005` → `0006` → `0007` → `0008` → `0009`.

`seed.sql` remains DEVELOPMENT DATA ONLY.

## Architectural rule
The public storefront is rendered from trusted Next.js server code. Browser code does not get anonymous direct table access. Authenticated customer account reads are protected with RLS. V1 Studio access is owner-only. The Supabase service-role key is server-only.

## Checkout/payment invariant
`cart → durable BAD ERA checkout snapshot + inventory reservation → Stripe Checkout → verified webhook → one atomic BAD ERA order/inventory conversion → fulfillment groups`

The success page is never payment truth and never performs fulfillment.

## Provider invariant
`BAD ERA order/fulfillment group → provider adapter`

Provider APIs do not leak upward into cart, order, storefront, or Studio business logic. New providers implement the contract in `src/lib/fulfillment/contract.ts`.

## Next increment
Kickoff v0.3 should add generated Supabase TypeScript types, repository/service implementations around the v0.2 RPCs, fulfillment job/retry execution, Resend transactional email templates, and runnable end-to-end tests against a local Supabase + Stripe CLI environment.

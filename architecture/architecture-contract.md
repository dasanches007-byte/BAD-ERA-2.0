# BAD ERA application architecture contract

## Locked runtime shape
- Next.js App Router only. Do not introduce the legacy Pages Router.
- React + TypeScript throughout application code.
- Tailwind uses locked BAD ERA design tokens.
- PostgreSQL is Supabase-hosted. Supabase Auth and Storage are used.
- Stripe is payment truth. Resend handles transactional email.
- Vercel is the intended deployment target.
- Server Components are the default for reads.
- Client Components are limited to interaction.
- External webhooks and privileged mutations terminate in Route Handlers and call domain services.
- Domain services own business rules. UI components never write database tables directly.
- The Supabase service-role client is server-only and may not be imported by client bundles.
- Fulfillment providers implement one internal adapter contract. Storefront/order code must not contain provider-specific branching.
- Manual Supplier and BAD ERA Stock are the first required provider implementations.

## Dependency direction
UI -> domain service -> repository/query layer -> Supabase/PostgreSQL
External webhook -> verifier -> domain service -> transaction/idempotency -> database
Provider adapter -> normalized BAD ERA fulfillment state

## Precedence
The Master Product & Engineering Specification v1.9 remains authoritative for product, UX, visual, workflow and business intent.
This kickoff package is authoritative for database/table names, migration order and application folder boundaries where v1.9 was intentionally conceptual.

## v0.2 security and transaction boundary
- Anonymous browser role has no public-table grants. Storefront data is served by trusted Next.js server code.
- Authenticated customers may read only their own profile/address/order/return/support data under RLS.
- Authenticated Studio owner receives owner-only policies on all public tables.
- Stripe/provider webhooks use the server-only Supabase service-role client and narrow SECURITY DEFINER RPCs.
- Every SECURITY DEFINER function uses an empty search_path and schema-qualified object names.
- Inventory reserve/release/paid conversion runs inside PostgreSQL transactions with row locks.

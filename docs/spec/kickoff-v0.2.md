BAD ERA
CLAUDE BUILD KICKOFF PACKAGE
v0.2 — Security, Atomic Commerce + Fulfillment Contract
Companion to Master Product & Engineering Specification v1.9 and Kickoff v0.1

## V0.2 LOCK
62-table PostgreSQL/Supabase schema with durable checkout snapshots.
RLS enabled on all 62 public tables; Studio owner policy on all 62.
Anonymous browser role receives no direct public-table access.
Atomic inventory reservation, release, payment-pending and paid conversion RPCs.
Verified/idempotent Stripe Checkout webhook orchestration.
Provider-agnostic TypeScript fulfillment contract with BAD ERA Stock and Manual Supplier adapters.
Critical integration-test acceptance matrix for stocked, bundle, supplier and mixed-cart flows.
Implementation guidance cross-checked against current Supabase Row Level Security / Database Functions guidance and Stripe Checkout fulfillment/webhook guidance in August 2026.

# 1. SECURITY MODEL — LOCKED
BAD ERA uses both PostgreSQL object grants and Row Level Security. RLS is defense in depth; it is not a substitute for server/client boundaries.

| Actor | Database access contract |
| Anonymous storefront browser | No direct public-table grants. Storefront catalog/content is rendered through trusted Next.js server code. |
| Authenticated customer | RLS-limited access to own profile/addresses and selected own order/return/support records only. |
| Studio owner | Authenticated user present in studio_users with role=owner and active=true. Owner policy permits Studio data operations. |
| Stripe/provider webhook | Server-only Supabase service-role client + narrow privileged RPCs. Never browser accessible. |
| Future Studio staff | Deferred. Schema keeps studio_role abstraction, but v1 policies authorize owner only. |


## 1.1 Supabase rules
Every public table has RLS enabled.
Authorization is never stored in user-editable user_metadata. Studio ownership is read from studio_users.
SECURITY DEFINER helpers/functions use an empty search_path and fully qualified relations.
Public function execution is revoked by default and selectively re-granted.
Service-role credentials and supplier credentials never enter client bundles.
private.is_studio_owner()private.current_customer_id()public tables: 62 / RLS enabled: 62 / owner policies: 62

# 2. RLS CUSTOMER ACCESS MATRIX

| Resource | Customer permission |
| customers | SELECT / UPDATE own authenticated customer row. |
| customer_addresses | SELECT / INSERT / UPDATE / DELETE own addresses. |
| orders | SELECT own historical orders. |
| order_items / order_item_components | SELECT only when parent order belongs to customer. |
| refunds / refund_items | SELECT only for own orders. |
| returns / return_items | SELECT own return records. |
| support_cases | SELECT + INSERT own cases. |
| support_messages | SELECT customer-visible messages; INSERT own customer messages. |
| supplier/provider/inventory/internal finance | No customer policy: denied. |
| checkout snapshots | No direct customer policy in v0.2: server-owned checkout infrastructure. |

Because authenticated receives SQL object privileges but rows require policies, adding a new table does not automatically make it customer-visible. The owner-all policy is separate from customer-self policies.

# 3. DURABLE CHECKOUT SNAPSHOT
Stripe Checkout must not depend on a mutable cart or mutable product record after the customer leaves BAD ERA. v0.2 adds three durable tables:

| Table | Purpose |
| checkout_sessions | Customer/contact/address/price totals, Stripe identifiers, reservation expiry and paid-order pointer. |
| checkout_lines | Immutable product/variant/price/option/fulfillment snapshots for each checkout line. |
| checkout_line_components | Physical/provider components for both standard products and bundles; powers inventory and routing. |

cart  ↓ server validationcheckout_sessions + checkout_lines + checkout_line_components  ↓ reserve_checkout_inventory()Stripe Checkout  ↓ verified webhookconvert_paid_checkout()  ↓BAD ERA order + fulfillment groups

## 3.1 Bundle behavior
Original Era Set remains one customer-facing bundle line.
Its selected virtual bundle variant resolves to Tee size + Crossbody color components.
Reservations and paid inventory movements act on the physical component variants, never a fake bundle stock pool.
Fulfillment can retain the bundle display line while storing component truth internally.

# 4. ATOMIC INVENTORY RPCS

| RPC | Invariant |
| reserve_checkout_inventory | Locks inventory rows; prevents oversell; records committed/backordered reservation and append-only inventory movement. |
| mark_checkout_payment_pending | Keeps inventory reserved when Checkout completed but delayed payment is still pending. |
| release_checkout_inventory | Releases active/payment-pending reservations exactly once for expiration, failure or cancellation. |
| release_expired_checkout_inventory | Recovery/maintenance sweep for abandoned prepared/stripe-created checkouts. |
| convert_paid_checkout | One transaction creates/returns the order, snapshots items/components, converts inventory, creates payment and fulfillment groups. |
| studio_adjust_inventory | Owner-only audited physical inventory adjustment; blocks system-only movement reasons. |


## 4.1 Internal vs supplier stock
Only checkout_line_components with fulfillment mode STOCKED participate in internal inventory reservations.
Supplier-stocked/manual/made-to-order lines do not decrement BAD ERA inventory_levels.
Supplier availability remains provider data, not BAD ERA on-hand inventory.

# 5. STRIPE PAYMENT / WEBHOOK CONTRACT
The Next.js route reads the request as raw text before Stripe signature verification. The success page is informational only and cannot create an order or fulfill stock.
POST /api/webhooks/stripe  request.text()  → stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)  → claim_stripe_event(event.id)  → event-specific commerce action  → finish_stripe_event(...)  → 2xx or retryable 5xx

| Stripe event | BAD ERA action |
| checkout.session.completed + paid | Atomic convert_paid_checkout. |
| checkout.session.completed + unpaid delayed method | mark_checkout_payment_pending; do not release stock. |
| checkout.session.async_payment_succeeded | Atomic convert_paid_checkout. |
| checkout.session.async_payment_failed | Release reservation; mark checkout payment_failed. |
| checkout.session.expired | Release abandoned reservation; mark checkout expired. |
| duplicate event ID | claim_stripe_event returns false; no duplicate commerce action. |


## 5.1 Idempotency
stripe_events has a unique Stripe event ID.
checkout_sessions has a paid_order_id and is row-locked during conversion.
orders has unique stripe_checkout_session_id.
inventory movement idempotency keys prevent duplicate movement records.
Duplicate or concurrent paid events return the already-created order.

# 6. FULFILLMENT PROVIDER CONTRACT
Provider integrations are adapters beneath one internal contract. BAD ERA checkout/order code never contains supplier-specific branching.
FulfillmentProviderAdapter  providerKey  connectionMode  checkAvailability?()  getQuote?()  submitOrder()  cancelOrder?()  getOrderStatus?()  getTracking?()  handleWebhook?()

| Provider | v0.2 behavior |
| BAD ERA Stock | Internal provider. submitOrder returns accepted/ready-to-ship; no external supplier API call. |
| Manual Supplier | Creates/uses durable supplier_tasks workflow; no API required. |
| Future API provider | Must implement the same contract after physical supplier validation. Provider-specific auth/status translation stays inside adapter. |


# 7. V0.2 CODE / FILE ADDITIONS
supabase/migrations/  0007_checkout_snapshots.sql  0008_atomic_commerce_rpcs.sql  0009_rls_security.sqlarchitecture/  security-contract-v0.2.mdsrc/lib/fulfillment/  contract.ts  registry.ts  providers/bad-era-stock.ts  providers/manual-supplier.tssrc/lib/payments/stripe/webhook.tssrc/lib/checkout/stripe-event-handler.tssrc/app/api/webhooks/stripe/route.tssrc/lib/db/commerce-rpc.tstests/integration/ACCEPTANCE_MATRIX.mdvalidation/static-validation.json
commerce-rpc.ts intentionally defines the v0.2 application boundary but remains a throwing placeholder. v0.3 implements it with the server-only Supabase client; this prevents v0.2 from pretending the application layer is finished.

# 8. STATIC VALIDATION RESULT

| Check | Result |
| exact_62_tables | PASS |
| all_fk_targets_resolve | PASS |
| rls_all_tables | PASS |
| owner_policy_all_tables | PASS |
| no_anon_table_grants | PASS |
| public_functions_restricted | PASS |
| all_functions_fixed_search_path | PASS |
| all_security_definer_fixed_search_path | PASS |
| raw_stripe_body | PASS |
| stripe_signature_construct | PASS |
| delayed_payment_handled | PASS |
| expired_releases | PASS |
| provider_contract_present | PASS |
| bad_era_stock_adapter | PASS |
| manual_supplier_adapter | PASS |
| bundle_seed | PASS |

Validated schema totals: 62 tables. Missing RLS: 0. Missing Studio-owner policies: 0. Unknown public FK targets: 0.
Static validation does not replace running the migrations against a real local Supabase/PostgreSQL instance. That runnable environment is an explicit v0.3 task.

# 9. CRITICAL INTEGRATION TESTS
Two concurrent reservation attempts for the last unit: exactly one succeeds when continue-selling is OFF.
Repeating reserve_checkout_inventory for the same checkout is a no-op, not a second reservation.
checkout.session.expired releases committed stock exactly once.
checkout.session.completed with unpaid delayed method moves reservations to payment_pending instead of releasing them.
async_payment_succeeded converts payment_pending reservation to one paid order and decrements on-hand exactly once.
async_payment_failed releases payment_pending reservation.
Duplicate or concurrent checkout.session.completed events return the same order and cannot duplicate order items/inventory movements.
Bundle S/Blue payment decrements Tee/S and Crossbody/Blue, never a bundle stock row.
Manual Supplier product creates a paid BAD ERA order plus a durable supplier_tasks row without an internal inventory_level decrement.
Mixed cart creates one order and independent fulfillment groups for BAD ERA Stock and Manual Supplier.
Authenticated normal customer cannot read variant_financials, supplier_tasks, fulfillment provider credentials/settings or another customer's orders.
Active Studio owner can perform Studio reads/writes; inactive/non-owner Studio user cannot.
Anonymous Data API role cannot select public tables.
Stripe signature verification fails if the request body is changed before constructEvent.
Published page revisions remain immutable after all v0.2 security migrations.

# 10. CLAUDE IMPLEMENTATION INSTRUCTIONS
Apply migrations numerically. Do not manually recreate this schema in Supabase Dashboard.
Do not expose anon table access merely to simplify storefront queries; use Next.js server reads.
Do not call privileged RPCs from browser code.
Do not change inventory inside Stripe success/cancel pages.
Do not release a delayed-payment reservation at checkout.session.completed when payment_status is unpaid.
Do not submit a supplier order inside the same database transaction that records Stripe payment truth.
Do not treat supplier quantity as internal on-hand inventory.
Do not bypass the provider adapter interface for a specific vendor.
Do not call v0.2 complete in production until migrations and acceptance tests pass on a local Supabase instance.

# 11. NEXT — KICKOFF v0.3

| Workstream | Next concrete output |
| Database types | Generate Supabase TypeScript Database types from the applied schema. |
| Repositories | Server-only typed catalog/cart/checkout/order/inventory/fulfillment repositories. |
| Commerce RPC implementation | Implement commerce-rpc.ts against Supabase RPCs and strict result validation. |
| Checkout creation | Implement server service that snapshots a validated cart, reserves stock and creates Stripe Checkout. |
| Fulfillment executor | Durable submission/retry worker logic outside payment conversion; Manual Supplier first. |
| Email | Resend order confirmation + shipping + failure-safe notification workflows. |
| Milestone 01 | Archive Tee M → Stripe → one order → one inventory decrement → Studio fulfillment → tracking. |
| Zero inventory | Manual Supplier purchase → supplier task → supplier reference → tracking. |
| Mixed cart | Stocked item + supplier item → one BAD ERA order → two fulfillment groups. |

Reference basis: Supabase recommends RLS for exposed schemas, explicit grants plus RLS, and fixed search_path for SECURITY DEFINER functions. Stripe recommends webhook-driven Checkout fulfillment, raw-body signature verification, and idempotent fulfillment that handles duplicate/concurrent calls.

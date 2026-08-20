-- Migration 0004: orders, payment truth, fulfillment routing, shipments and recovery.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default public.next_bad_era_order_number(),
  cart_id uuid unique references public.carts(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  source public.order_source not null default 'storefront',
  customer_email citext not null,
  customer_phone text,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  shipping_cents bigint not null default 0 check (shipping_cents >= 0),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  total_cents bigint not null check (total_cents >= 0),
  payment_status public.payment_status not null default 'pending',
  fulfillment_status public.order_fulfillment_status not null default 'unfulfilled',
  return_status public.order_return_status not null default 'none',
  refund_status public.order_refund_status not null default 'none',
  stripe_checkout_session_id citext unique,
  stripe_payment_intent_id citext unique,
  customer_snapshot jsonb not null,
  shipping_address_snapshot jsonb not null,
  billing_address_snapshot jsonb,
  shipping_method_snapshot jsonb,
  metadata jsonb not null default '{}'::jsonb,
  placed_at timestamptz not null default now(),
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (subtotal_cents - discount_cents + shipping_cents + tax_cents = total_cents)
);

alter table public.carts
  add constraint carts_converted_order_fk
  foreign key (converted_order_id) references public.orders(id) on delete set null;

alter table public.inventory_reservations
  add constraint inventory_reservations_converted_order_fk
  foreign key (converted_order_id) references public.orders(id) on delete set null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  product_handle_snapshot text not null,
  product_title_snapshot text not null,
  variant_title_snapshot text not null,
  sku_snapshot text,
  options_snapshot jsonb not null default '{}'::jsonb,
  display_snapshot jsonb not null default '{}'::jsonb,
  fulfillment_mode_snapshot public.inventory_mode not null,
  provider_id_snapshot uuid references public.fulfillment_providers(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  line_total_cents bigint not null check (line_total_cents >= 0),
  is_bundle boolean not null default false,
  created_at timestamptz not null default now(),
  check ((unit_price_cents * quantity) - discount_cents + tax_cents = line_total_cents)
);

create table public.order_item_components (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  component_variant_id uuid not null references public.product_variants(id) on delete restrict,
  component_title_snapshot text not null,
  component_sku_snapshot text,
  quantity_per_parent integer not null check (quantity_per_parent > 0),
  total_quantity integer not null check (total_quantity > 0),
  provider_id_snapshot uuid references public.fulfillment_providers(id) on delete restrict,
  location_id_snapshot uuid references public.inventory_locations(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (order_item_id, component_variant_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  external_payment_intent_id citext,
  status public.payment_status not null default 'pending',
  amount_authorized_cents bigint not null default 0 check (amount_authorized_cents >= 0),
  amount_captured_cents bigint not null default 0 check (amount_captured_cents >= 0),
  amount_refunded_cents bigint not null default 0 check (amount_refunded_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  raw_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_external_intent_unique_idx
  on public.payments(external_payment_intent_id)
  where external_payment_intent_id is not null;

create table public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id citext not null unique,
  event_type text not null,
  payload_hash text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'received'
    check (processing_status in ('received','processed','ignored','failed')),
  error_message text
);

create table public.fulfillment_groups (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider_id uuid not null references public.fulfillment_providers(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  routing_mode public.fulfillment_routing_mode not null,
  canonical_status public.fulfillment_group_status not null default 'pending_submission',
  raw_provider_status text,
  provider_order_id text,
  submission_key uuid not null default gen_random_uuid() unique,
  auto_submit boolean not null default false,
  effective_shipping_address_snapshot jsonb not null,
  estimated_cost_cents bigint check (estimated_cost_cents is null or estimated_cost_cents >= 0),
  actual_cost_cents bigint check (actual_cost_cents is null or actual_cost_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  submitted_at timestamptz,
  accepted_at timestamptz,
  production_started_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fulfillment_group_items (
  id uuid primary key default gen_random_uuid(),
  fulfillment_group_id uuid not null references public.fulfillment_groups(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  order_item_component_id uuid references public.order_item_components(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity_required integer not null check (quantity_required > 0),
  quantity_fulfilled integer not null default 0 check (quantity_fulfilled >= 0),
  created_at timestamptz not null default now(),
  check (quantity_fulfilled <= quantity_required),
  unique (fulfillment_group_id, order_item_id, order_item_component_id, variant_id)
);

create table public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.fulfillment_providers(id) on delete restrict,
  external_event_id text,
  event_type text not null,
  payload_hash text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'received'
    check (processing_status in ('received','processed','ignored','failed')),
  error_message text
);

create unique index provider_events_external_unique_idx
  on public.provider_events(provider_id, external_event_id)
  where external_event_id is not null;

create table public.provider_attempts (
  id uuid primary key default gen_random_uuid(),
  fulfillment_group_id uuid not null references public.fulfillment_groups(id) on delete cascade,
  operation text not null,
  attempt_number integer not null check (attempt_number > 0),
  submission_key uuid not null,
  result public.recovery_result not null default 'started',
  provider_reference text,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (fulfillment_group_id, operation, attempt_number)
);

create table public.supplier_tasks (
  id uuid primary key default gen_random_uuid(),
  fulfillment_group_id uuid not null unique references public.fulfillment_groups(id) on delete cascade,
  status public.supplier_task_status not null default 'required',
  ordering_url_snapshot text,
  supplier_reference text,
  expected_cost_cents bigint check (expected_cost_cents is null or expected_cost_cents >= 0),
  actual_cost_cents bigint check (actual_cost_cents is null or actual_cost_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  assigned_to uuid references auth.users(id) on delete set null,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fulfillment_issues (
  id uuid primary key default gen_random_uuid(),
  fulfillment_group_id uuid not null references public.fulfillment_groups(id) on delete cascade,
  provider_id uuid not null references public.fulfillment_providers(id) on delete restrict,
  issue_code text not null check (issue_code in (
    'SUBMISSION_FAILED','PROVIDER_REJECTED','SUPPLIER_OUT_OF_STOCK',
    'VARIANT_MAPPING_ERROR','PROVIDER_AUTH_ERROR','INVALID_FULFILLMENT_ADDRESS',
    'QUOTE_ERROR','RATE_ERROR','TRACKING_ERROR','PROVIDER_TIMEOUT','UNKNOWN_PROVIDER_ERROR'
  )),
  severity public.issue_severity not null default 'warning',
  retryable boolean not null default false,
  owner_summary text not null,
  diagnostic_reference text,
  opened_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  resolved_at timestamptz,
  resolution_type text,
  resolved_by uuid references auth.users(id) on delete set null
);

create table public.fulfillment_recovery_attempts (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.fulfillment_issues(id) on delete cascade,
  fulfillment_group_id uuid not null references public.fulfillment_groups(id) on delete cascade,
  operation text not null,
  attempt_number integer not null check (attempt_number > 0),
  submission_key uuid not null,
  result public.recovery_result not null default 'started',
  provider_reference text,
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  actor_user_id uuid references auth.users(id) on delete set null,
  unique (issue_id, operation, attempt_number)
);

create table public.fulfillment_routing_overrides (
  id uuid primary key default gen_random_uuid(),
  fulfillment_group_id uuid not null references public.fulfillment_groups(id) on delete cascade,
  original_provider_id uuid not null references public.fulfillment_providers(id) on delete restrict,
  override_provider_id uuid references public.fulfillment_providers(id) on delete restrict,
  manual_mode boolean not null default false,
  reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (override_provider_id is not null or manual_mode = true)
);

create table public.fulfillment_address_corrections (
  id uuid primary key default gen_random_uuid(),
  fulfillment_group_id uuid not null references public.fulfillment_groups(id) on delete cascade,
  original_order_address_snapshot jsonb not null,
  corrected_address_snapshot jsonb not null,
  reason text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.customer_fulfillment_consents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  fulfillment_group_id uuid references public.fulfillment_groups(id) on delete cascade,
  consent_type text not null check (consent_type in ('SUBSTITUTION','ADDRESS_CHANGE','DELIVERY_CHANGE','OTHER')),
  proposed_change jsonb not null,
  customer_response text not null check (customer_response in ('approved','declined','pending')),
  evidence_reference text,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  fulfillment_group_id uuid not null references public.fulfillment_groups(id) on delete cascade,
  status public.shipment_status not null default 'pending',
  carrier text,
  service_level text,
  tracking_number text,
  tracking_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipment_items (
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  fulfillment_group_item_id uuid not null references public.fulfillment_group_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  primary key (shipment_id, fulfillment_group_item_id)
);

-- COMBINED REFERENCE FILE. Apply numbered migrations in order.

-- BAD ERA / Supabase
-- Migration 0001: extensions, enums, sequences and shared helpers.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.studio_role as enum ('owner', 'content', 'fulfillment', 'support');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.product_kind as enum ('standard', 'bundle');
create type public.inventory_mode as enum ('stocked', 'supplier_stocked', 'made_to_order', 'manual_supplier', 'untracked', 'preorder');

create type public.provider_type as enum ('internal', 'api', 'manual');
create type public.provider_connection_mode as enum ('internal', 'api', 'manual');
create type public.provider_lifecycle_status as enum (
  'draft', 'sample_testing', 'test', 'live_manual', 'live_automated', 'disabled'
);
create type public.provider_health_status as enum ('connected', 'degraded', 'error', 'manual', 'disabled');
create type public.availability_mode as enum ('api_sync', 'webhook_sync', 'manual', 'made_to_order');
create type public.availability_sync_status as enum ('ok', 'stale', 'error', 'manual');

create type public.cart_status as enum ('active', 'converted', 'abandoned', 'expired');
create type public.reservation_status as enum ('active', 'converted', 'released', 'expired');

create type public.payment_status as enum ('pending', 'paid', 'partially_refunded', 'refunded', 'failed');
create type public.order_fulfillment_status as enum ('unfulfilled', 'partial', 'fulfilled', 'cancelled');
create type public.order_return_status as enum ('none', 'requested', 'approved', 'in_transit', 'received', 'partial', 'returned', 'rejected', 'closed');
create type public.order_refund_status as enum ('none', 'partial', 'full');
create type public.order_source as enum ('storefront', 'studio', 'import');

create type public.fulfillment_group_status as enum (
  'pending_submission', 'submitted', 'accepted', 'in_production',
  'shipped', 'delivered', 'action_required', 'rejected', 'cancelled'
);
create type public.fulfillment_routing_mode as enum ('internal', 'manual', 'automatic');
create type public.supplier_task_status as enum ('required', 'in_progress', 'submitted', 'completed', 'cancelled');
create type public.issue_severity as enum ('info', 'warning', 'critical');
create type public.recovery_result as enum ('started', 'succeeded', 'failed', 'no_op', 'needs_review');
create type public.shipment_status as enum ('pending', 'shipped', 'delivered', 'exception', 'returned');

create type public.inventory_reason as enum (
  'initial_stock', 'checkout_reserve', 'reservation_release', 'order_sale',
  'stock_recount', 'found_stock', 'damaged', 'lost', 'return_restock',
  'manual_correction', 'order_correction', 'cancellation_release', 'backorder_created', 'other'
);

create type public.return_status as enum ('requested', 'approved', 'rejected', 'in_transit', 'received', 'closed', 'cancelled');
create type public.return_item_condition as enum ('unopened', 'resellable', 'damaged', 'unknown');
create type public.return_disposition as enum ('restock', 'damaged', 'nonrestockable', 'manual_review');
create type public.refund_status as enum ('pending', 'succeeded', 'failed', 'cancelled');

create type public.support_case_status as enum ('open', 'waiting_customer', 'waiting_internal', 'resolved', 'closed');
create type public.support_author_type as enum ('customer', 'studio_user', 'system');

create type public.media_status as enum ('draft', 'approved', 'restricted', 'archived');
create type public.media_kind as enum ('image', 'video', 'document');
create type public.page_kind as enum ('page', 'global');
create type public.revision_state as enum ('draft', 'published', 'archived');
create type public.publish_set_status as enum ('prepared', 'published', 'failed', 'rolled_back');

create sequence if not exists public.bad_era_order_number_seq start with 1000 increment by 1;
create sequence if not exists public.bad_era_return_number_seq start with 1000 increment by 1;
create sequence if not exists public.bad_era_support_number_seq start with 1000 increment by 1;

create or replace function public.next_bad_era_order_number()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'BE-' || nextval('public.bad_era_order_number_seq')::text;
$$;

create or replace function public.next_bad_era_return_number()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'RET-' || nextval('public.bad_era_return_number_seq')::text;
$$;

create or replace function public.next_bad_era_support_number()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'CASE-' || nextval('public.bad_era_support_number_seq')::text;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- Migration 0002: studio identity, providers, media, catalog and merchandising.

create table public.studio_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.studio_role not null default 'owner',
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fulfillment_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key citext not null unique,
  name text not null,
  provider_type public.provider_type not null,
  connection_mode public.provider_connection_mode not null,
  lifecycle_status public.provider_lifecycle_status not null default 'draft',
  health_status public.provider_health_status not null default 'manual',
  contact_name text,
  contact_email citext,
  ordering_url text,
  credentials_secret_ref text,
  typical_production_min_days integer check (typical_production_min_days is null or typical_production_min_days >= 0),
  typical_production_max_days integer check (typical_production_max_days is null or typical_production_max_days >= typical_production_min_days),
  typical_shipping_min_days integer check (typical_shipping_min_days is null or typical_shipping_min_days >= 0),
  typical_shipping_max_days integer check (typical_shipping_max_days is null or typical_shipping_max_days >= typical_shipping_min_days),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.fulfillment_providers(id) on delete restrict,
  code citext not null unique,
  name text not null,
  active boolean not null default true,
  fulfills_online_orders boolean not null default true,
  address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  status public.media_status not null default 'draft',
  kind public.media_kind not null default 'image',
  bucket text not null,
  storage_path text not null,
  original_filename text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  alt_text text,
  checksum_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (bucket, storage_path)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  handle citext not null unique,
  title text not null,
  subtitle text,
  description text,
  product_type text,
  tags text[] not null default '{}'::text[],
  status public.product_status not null default 'draft',
  kind public.product_kind not null default 'standard',
  requires_shipping boolean not null default true,
  taxable boolean not null default true,
  seo_title text,
  seo_description text,
  social_media_asset_id uuid references public.media_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, name)
);

create table public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.product_options(id) on delete cascade,
  value text not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (option_id, value)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  title text not null,
  sku citext,
  barcode citext,
  price_cents bigint not null check (price_cents >= 0),
  compare_at_price_cents bigint check (compare_at_price_cents is null or compare_at_price_cents >= price_cents),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  inventory_mode public.inventory_mode not null default 'stocked',
  fulfillment_provider_id uuid references public.fulfillment_providers(id) on delete restrict,
  track_inventory boolean not null default true,
  continue_selling_when_out_of_stock boolean not null default false,
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  weight_grams integer check (weight_grams is null or weight_grams >= 0),
  position integer not null default 0 check (position >= 0),
  is_default boolean not null default false,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index product_variants_sku_unique_idx
  on public.product_variants (sku)
  where sku is not null;

create unique index product_variants_barcode_unique_idx
  on public.product_variants (barcode)
  where barcode is not null;

create unique index product_variants_one_default_idx
  on public.product_variants (product_id)
  where is_default = true;

create table public.variant_option_values (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  option_id uuid not null references public.product_options(id) on delete cascade,
  option_value_id uuid not null references public.product_option_values(id) on delete restrict,
  primary key (variant_id, option_id),
  unique (variant_id, option_value_id)
);

create table public.variant_financials (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  internal_unit_cost_cents bigint check (internal_unit_cost_cents is null or internal_unit_cost_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  role text not null default 'gallery' check (role in ('gallery','hero','detail','lifestyle','card','mobile')),
  position integer not null default 0 check (position >= 0),
  focal_x numeric(5,4) check (focal_x is null or (focal_x >= 0 and focal_x <= 1)),
  focal_y numeric(5,4) check (focal_y is null or (focal_y >= 0 and focal_y <= 1)),
  created_at timestamptz not null default now(),
  unique (product_id, variant_id, media_asset_id, role)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  handle citext not null unique,
  title text not null,
  description text,
  status public.product_status not null default 'draft',
  collection_type text not null default 'manual' check (collection_type in ('manual','dynamic')),
  dynamic_rule jsonb,
  hero_media_asset_id uuid references public.media_assets(id) on delete set null,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  pinned boolean not null default false,
  hidden boolean not null default false,
  card_media_asset_id uuid references public.media_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (collection_id, product_id)
);

create table public.bundle_components (
  bundle_variant_id uuid not null references public.product_variants(id) on delete restrict,
  component_variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity_required integer not null check (quantity_required > 0),
  created_at timestamptz not null default now(),
  primary key (bundle_variant_id, component_variant_id),
  check (bundle_variant_id <> component_variant_id)
);

create table public.provider_variant_mappings (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  provider_id uuid not null references public.fulfillment_providers(id) on delete restrict,
  provider_product_id text,
  provider_variant_id text,
  supplier_sku citext,
  supplier_cost_cents bigint check (supplier_cost_cents is null or supplier_cost_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  availability_mode public.availability_mode not null default 'manual',
  sync_status public.availability_sync_status not null default 'manual',
  stock_buffer integer not null default 0 check (stock_buffer >= 0),
  auto_submit boolean not null default false,
  production_min_days integer check (production_min_days is null or production_min_days >= 0),
  production_max_days integer check (production_max_days is null or production_max_days >= production_min_days),
  shipping_min_days integer check (shipping_min_days is null or shipping_min_days >= 0),
  shipping_max_days integer check (shipping_max_days is null or shipping_max_days >= shipping_min_days),
  return_destination_mode text not null default 'MANUAL_REVIEW'
    check (return_destination_mode in ('BAD_ERA','SUPPLIER','MANUAL_REVIEW','NON_RETURNABLE')),
  active boolean not null default true,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, provider_id)
);

create unique index provider_variant_mapping_external_unique_idx
  on public.provider_variant_mappings (provider_id, provider_variant_id)
  where provider_variant_id is not null;

create table public.provider_variant_availability (
  mapping_id uuid primary key references public.provider_variant_mappings(id) on delete cascade,
  reported_quantity integer,
  sellable_quantity integer,
  is_available boolean not null default true,
  source_status text,
  checked_at timestamptz not null default now(),
  payload_hash text,
  metadata jsonb not null default '{}'::jsonb,
  check (reported_quantity is null or reported_quantity >= 0),
  check (sellable_quantity is null or sellable_quantity >= 0)
);


-- Migration 0003: customers, carts, internal inventory and checkout reservations.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email citext not null unique,
  first_name text,
  last_name text,
  phone text,
  marketing_opt_in boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text,
  recipient_name text not null,
  company text,
  line1 text not null,
  line2 text,
  city text not null,
  region text not null,
  postal_code text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  phone text,
  is_default_shipping boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customer_one_default_shipping_idx
  on public.customer_addresses(customer_id)
  where is_default_shipping = true;

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  session_token uuid not null default gen_random_uuid() unique,
  customer_id uuid references public.customers(id) on delete set null,
  status public.cart_status not null default 'active',
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  expires_at timestamptz,
  converted_order_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table public.inventory_levels (
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  on_hand integer not null default 0 check (on_hand >= 0),
  committed integer not null default 0 check (committed >= 0),
  unavailable integer not null default 0 check (unavailable >= 0),
  incoming integer not null default 0 check (incoming >= 0),
  backordered integer not null default 0 check (backordered >= 0),
  available integer generated always as (greatest(on_hand - committed - unavailable, 0)) stored,
  version bigint not null default 0 check (version >= 0),
  updated_at timestamptz not null default now(),
  primary key (variant_id, location_id),
  check (committed + unavailable <= on_hand)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  reason public.inventory_reason not null,
  delta_on_hand integer not null default 0,
  delta_committed integer not null default 0,
  delta_unavailable integer not null default 0,
  delta_backordered integer not null default 0,
  before_state jsonb not null,
  after_state jsonb not null,
  source_type text,
  source_id uuid,
  source_reference text,
  actor_user_id uuid references auth.users(id) on delete set null,
  idempotency_key text,
  note text,
  created_at timestamptz not null default now(),
  check (
    delta_on_hand <> 0 or delta_committed <> 0 or delta_unavailable <> 0 or delta_backordered <> 0
  )
);

create unique index inventory_movements_idempotency_unique_idx
  on public.inventory_movements (idempotency_key)
  where idempotency_key is not null;

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  checkout_token uuid not null,
  cart_id uuid references public.carts(id) on delete cascade,
  cart_item_id uuid references public.cart_items(id) on delete cascade,
  source_line_key text not null,
  requested_variant_id uuid not null references public.product_variants(id) on delete restrict,
  stock_variant_id uuid not null references public.product_variants(id) on delete restrict,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status public.reservation_status not null default 'active',
  expires_at timestamptz not null,
  converted_order_id uuid,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  converted_at timestamptz,
  unique (checkout_token, source_line_key, stock_variant_id, location_id)
);


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


-- Migration 0005: refunds, returns, support, content/publishing, audit and operational settings.

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete restrict,
  stripe_refund_id citext unique,
  status public.refund_status not null default 'pending',
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  reason text,
  initiated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  succeeded_at timestamptz,
  failed_at timestamptz
);

create table public.refund_items (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references public.refunds(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  amount_cents bigint not null check (amount_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique default public.next_bad_era_return_number(),
  order_id uuid not null references public.orders(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  status public.return_status not null default 'requested',
  reason text not null,
  customer_note text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  received_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  order_item_component_id uuid references public.order_item_components(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  item_condition public.return_item_condition not null default 'unknown',
  disposition public.return_disposition not null default 'manual_review',
  destination_provider_id uuid references public.fulfillment_providers(id) on delete restrict,
  destination_location_id uuid references public.inventory_locations(id) on delete restrict,
  restocked_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table public.support_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique default public.next_bad_era_support_number(),
  customer_id uuid references public.customers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  status public.support_case_status not null default 'open',
  subject text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete cascade,
  author_type public.support_author_type not null,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  customer_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.support_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  page_key citext not null unique,
  page_kind public.page_kind not null default 'page',
  route text,
  title text not null,
  template_key text not null,
  is_system boolean not null default false,
  published_revision_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route)
);

create table public.page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  state public.revision_state not null default 'draft',
  source_revision_id uuid references public.page_revisions(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  note text,
  unique (page_id, revision_number)
);

alter table public.pages
  add constraint pages_published_revision_fk
  foreign key (published_revision_id) references public.page_revisions(id) on delete restrict;

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.page_revisions(id) on delete cascade,
  section_key text not null,
  section_type text not null,
  schema_version integer not null default 1 check (schema_version > 0),
  position integer not null default 0 check (position >= 0),
  enabled boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (revision_id, section_key)
);

create table public.page_drafts (
  page_id uuid primary key references public.pages(id) on delete cascade,
  revision_id uuid not null unique references public.page_revisions(id) on delete cascade,
  locked_by uuid references auth.users(id) on delete set null,
  lock_expires_at timestamptz,
  autosaved_at timestamptz not null default now()
);

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.page_revisions(id) on delete cascade,
  menu_key text not null,
  parent_item_id uuid references public.navigation_items(id) on delete cascade,
  label text not null,
  destination text not null,
  position integer not null default 0 check (position >= 0),
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key citext primary key,
  value jsonb not null,
  visibility text not null default 'studio' check (visibility in ('public','studio','secret_reference')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.publish_sets (
  id uuid primary key default gen_random_uuid(),
  status public.publish_set_status not null default 'prepared',
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  failed_at timestamptz
);

create table public.publish_set_items (
  publish_set_id uuid not null references public.publish_sets(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete restrict,
  revision_id uuid not null references public.page_revisions(id) on delete restrict,
  previous_revision_id uuid references public.page_revisions(id) on delete restrict,
  primary key (publish_set_id, page_id)
);

create table public.media_asset_usages (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  placement_key text,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  integration_key text not null,
  external_event_id text,
  event_type text not null,
  direction text not null check (direction in ('inbound','outbound')),
  status text not null check (status in ('received','sent','processed','failed','ignored')),
  payload_hash text,
  reference_type text,
  reference_id uuid,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index integration_events_external_unique_idx
  on public.integration_events(integration_key, external_event_id)
  where external_event_id is not null;

create table public.idempotency_records (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  idempotency_key text not null,
  status text not null check (status in ('started','succeeded','failed')),
  reference_type text,
  reference_id uuid,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, idempotency_key)
);


-- Migration 0006: indexes, updated_at triggers and immutability protections.
-- RLS policies and transactional inventory RPCs are intentionally the next kickoff package layer.

create index products_status_idx on public.products(status);
create index product_variants_product_idx on public.product_variants(product_id, active);
create index product_media_product_position_idx on public.product_media(product_id, position);
create index collection_products_collection_position_idx on public.collection_products(collection_id, position);
create index provider_variant_mappings_provider_idx on public.provider_variant_mappings(provider_id, active);
create index carts_customer_status_idx on public.carts(customer_id, status);
create index inventory_levels_location_idx on public.inventory_levels(location_id, available);
create index inventory_reservations_checkout_idx on public.inventory_reservations(checkout_token, status, expires_at);
create index inventory_reservations_expiry_idx on public.inventory_reservations(status, expires_at);
create index orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index orders_email_created_idx on public.orders(customer_email, created_at desc);
create index orders_payment_fulfillment_idx on public.orders(payment_status, fulfillment_status, created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index fulfillment_groups_order_idx on public.fulfillment_groups(order_id, canonical_status);
create index fulfillment_groups_provider_idx on public.fulfillment_groups(provider_id, canonical_status);
create index fulfillment_issues_open_idx on public.fulfillment_issues(resolved_at, severity, opened_at);
create index shipments_group_idx on public.shipments(fulfillment_group_id, status);
create index returns_order_idx on public.returns(order_id, status);
create index support_cases_customer_idx on public.support_cases(customer_id, status);
create index page_revisions_page_state_idx on public.page_revisions(page_id, state, revision_number desc);
create index page_sections_revision_position_idx on public.page_sections(revision_id, position);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);

create trigger studio_users_set_updated_at before update on public.studio_users
for each row execute function public.set_updated_at();
create trigger fulfillment_providers_set_updated_at before update on public.fulfillment_providers
for each row execute function public.set_updated_at();
create trigger inventory_locations_set_updated_at before update on public.inventory_locations
for each row execute function public.set_updated_at();
create trigger media_assets_set_updated_at before update on public.media_assets
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
for each row execute function public.set_updated_at();
create trigger variant_financials_set_updated_at before update on public.variant_financials
for each row execute function public.set_updated_at();
create trigger collections_set_updated_at before update on public.collections
for each row execute function public.set_updated_at();
create trigger provider_variant_mappings_set_updated_at before update on public.provider_variant_mappings
for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();
create trigger customer_addresses_set_updated_at before update on public.customer_addresses
for each row execute function public.set_updated_at();
create trigger carts_set_updated_at before update on public.carts
for each row execute function public.set_updated_at();
create trigger cart_items_set_updated_at before update on public.cart_items
for each row execute function public.set_updated_at();
create trigger inventory_levels_set_updated_at before update on public.inventory_levels
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
for each row execute function public.set_updated_at();
create trigger fulfillment_groups_set_updated_at before update on public.fulfillment_groups
for each row execute function public.set_updated_at();
create trigger supplier_tasks_set_updated_at before update on public.supplier_tasks
for each row execute function public.set_updated_at();
create trigger shipments_set_updated_at before update on public.shipments
for each row execute function public.set_updated_at();
create trigger returns_set_updated_at before update on public.returns
for each row execute function public.set_updated_at();
create trigger support_cases_set_updated_at before update on public.support_cases
for each row execute function public.set_updated_at();
create trigger pages_set_updated_at before update on public.pages
for each row execute function public.set_updated_at();
create trigger page_sections_set_updated_at before update on public.page_sections
for each row execute function public.set_updated_at();
create trigger navigation_items_set_updated_at before update on public.navigation_items
for each row execute function public.set_updated_at();
create trigger idempotency_records_set_updated_at before update on public.idempotency_records
for each row execute function public.set_updated_at();

create or replace function public.prevent_inventory_movement_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'inventory_movements is append-only';
end;
$$;

create trigger inventory_movements_no_update
before update or delete on public.inventory_movements
for each row execute function public.prevent_inventory_movement_mutation();

create or replace function public.prevent_published_revision_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.state = 'published' then
    raise exception 'published page revisions are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger page_revisions_no_published_mutation
before update or delete on public.page_revisions
for each row execute function public.prevent_published_revision_mutation();

create or replace function public.prevent_published_section_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  rev_state public.revision_state;
begin
  select state into rev_state
  from public.page_revisions
  where id = coalesce(old.revision_id, new.revision_id);

  if rev_state = 'published' then
    raise exception 'sections belonging to a published revision are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger page_sections_no_published_mutation
before update or delete on public.page_sections
for each row execute function public.prevent_published_section_mutation();

create or replace function public.prevent_published_navigation_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  rev_state public.revision_state;
begin
  select state into rev_state
  from public.page_revisions
  where id = coalesce(old.revision_id, new.revision_id);

  if rev_state = 'published' then
    raise exception 'navigation belonging to a published revision is immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger navigation_no_published_mutation
before update or delete on public.navigation_items
for each row execute function public.prevent_published_navigation_mutation();


-- Migration 0007: durable checkout snapshots and reservation/payment-pending support.

alter type public.reservation_status add value if not exists 'payment_pending';

create type public.checkout_snapshot_status as enum (
  'prepared', 'stripe_created', 'payment_pending', 'paid', 'expired', 'payment_failed', 'cancelled'
);

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  checkout_token uuid not null default gen_random_uuid() unique,
  cart_id uuid references public.carts(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  status public.checkout_snapshot_status not null default 'prepared',
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  customer_email citext not null,
  customer_phone text,
  customer_snapshot jsonb not null default '{}'::jsonb,
  shipping_address_snapshot jsonb not null,
  billing_address_snapshot jsonb,
  shipping_method_snapshot jsonb not null default '{}'::jsonb,
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  shipping_cents bigint not null default 0 check (shipping_cents >= 0),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  total_cents bigint not null check (total_cents >= 0),
  stripe_checkout_session_id citext unique,
  stripe_payment_intent_id citext,
  reservation_expires_at timestamptz not null,
  stripe_expires_at timestamptz,
  paid_order_id uuid references public.orders(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  check (subtotal_cents - discount_cents + shipping_cents + tax_cents = total_cents)
);

create table public.checkout_lines (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id uuid not null references public.checkout_sessions(id) on delete cascade,
  source_cart_item_id uuid references public.cart_items(id) on delete set null,
  line_key text not null,
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
  unique (checkout_session_id, line_key),
  check ((unit_price_cents * quantity) - discount_cents + tax_cents = line_total_cents)
);

create table public.checkout_line_components (
  id uuid primary key default gen_random_uuid(),
  checkout_line_id uuid not null references public.checkout_lines(id) on delete cascade,
  component_variant_id uuid not null references public.product_variants(id) on delete restrict,
  component_title_snapshot text not null,
  component_sku_snapshot text,
  fulfillment_mode_snapshot public.inventory_mode not null,
  provider_id_snapshot uuid references public.fulfillment_providers(id) on delete restrict,
  location_id_snapshot uuid references public.inventory_locations(id) on delete restrict,
  quantity_per_parent integer not null check (quantity_per_parent > 0),
  total_quantity integer not null check (total_quantity > 0),
  created_at timestamptz not null default now(),
  unique (checkout_line_id, component_variant_id),
  check (fulfillment_mode_snapshot = 'untracked' or provider_id_snapshot is not null),
  check (fulfillment_mode_snapshot <> 'stocked' or location_id_snapshot is not null)
);

alter table public.inventory_reservations
  add column checkout_session_id uuid references public.checkout_sessions(id) on delete cascade,
  add column reserved_on_hand integer not null default 0 check (reserved_on_hand >= 0),
  add column reserved_backordered integer not null default 0 check (reserved_backordered >= 0);

create index checkout_sessions_status_expiry_idx
  on public.checkout_sessions(status, reservation_expires_at);
create index checkout_sessions_stripe_idx
  on public.checkout_sessions(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create index checkout_lines_session_idx on public.checkout_lines(checkout_session_id);
create index checkout_line_components_line_idx on public.checkout_line_components(checkout_line_id);
create index inventory_reservations_checkout_session_idx
  on public.inventory_reservations(checkout_session_id, status);

create trigger checkout_sessions_set_updated_at
before update on public.checkout_sessions
for each row execute function public.set_updated_at();


-- Migration 0008: atomic inventory, paid-order conversion and Stripe event RPCs.
-- Privileged functions are SECURITY DEFINER with an empty search_path and are executable only by service_role,
-- except studio_adjust_inventory which additionally verifies the current authenticated user is the active owner.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_studio_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.studio_users su
    where su.user_id = (select auth.uid())
      and su.active = true
      and su.role = 'owner'
  );
$$;

create or replace function private.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.customers c
  where c.auth_user_id = (select auth.uid())
  limit 1;
$$;

revoke execute on function private.is_studio_owner() from public, anon, authenticated;
revoke execute on function private.current_customer_id() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_studio_owner() to authenticated;
grant execute on function private.current_customer_id() to authenticated;

create or replace function public.claim_stripe_event(
  p_stripe_event_id text,
  p_event_type text,
  p_payload_hash text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  insert into public.stripe_events(stripe_event_id, event_type, payload_hash, processing_status)
  values (p_stripe_event_id, p_event_type, p_payload_hash, 'received')
  on conflict (stripe_event_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

create or replace function public.finish_stripe_event(
  p_stripe_event_id text,
  p_processing_status text,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_processing_status not in ('processed','ignored','failed') then
    raise exception 'invalid stripe event terminal status';
  end if;
  update public.stripe_events
  set processing_status = p_processing_status,
      processed_at = now(),
      error_message = p_error_message
  where stripe_event_id = p_stripe_event_id;
end;
$$;

create or replace function public.reserve_checkout_inventory(p_checkout_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.checkout_sessions%rowtype;
  req record;
  lvl public.inventory_levels%rowtype;
  v public.product_variants%rowtype;
  onhand_to_reserve integer;
  backorder_to_reserve integer;
  before_json jsonb;
  after_json jsonb;
begin
  select * into s
  from public.checkout_sessions
  where id = p_checkout_session_id
  for update;

  if not found then raise exception 'checkout session not found'; end if;
  if s.status not in ('prepared','stripe_created') then
    raise exception 'checkout session cannot reserve from status %', s.status;
  end if;
  if s.reservation_expires_at <= now() then
    raise exception 'checkout reservation already expired';
  end if;

  if exists (
    select 1 from public.inventory_reservations ir
    where ir.checkout_session_id = s.id and ir.status in ('active','payment_pending','converted')
  ) then
    return jsonb_build_object('status','already_reserved','checkout_session_id',s.id);
  end if;

  for req in
    select
      cl.line_key,
      cl.variant_id as requested_variant_id,
      clc.component_variant_id as stock_variant_id,
      clc.location_id_snapshot as location_id,
      sum(clc.total_quantity)::integer as quantity
    from public.checkout_lines cl
    join public.checkout_line_components clc on clc.checkout_line_id = cl.id
    where cl.checkout_session_id = s.id
      and clc.fulfillment_mode_snapshot = 'stocked'
    group by cl.line_key, cl.variant_id, clc.component_variant_id, clc.location_id_snapshot
    order by clc.component_variant_id, clc.location_id_snapshot
  loop
    if req.location_id is null then
      raise exception 'stocked component % has no inventory location', req.stock_variant_id;
    end if;

    select * into v
    from public.product_variants
    where id = req.stock_variant_id;
    if not found or v.active = false then raise exception 'stock variant unavailable'; end if;

    select * into lvl
    from public.inventory_levels
    where variant_id = req.stock_variant_id and location_id = req.location_id
    for update;
    if not found then raise exception 'inventory level missing for variant %', req.stock_variant_id; end if;

    if lvl.available < req.quantity and v.continue_selling_when_out_of_stock = false then
      raise exception 'insufficient inventory for variant %: need %, available %', req.stock_variant_id, req.quantity, lvl.available;
    end if;

    onhand_to_reserve := least(req.quantity, lvl.available);
    backorder_to_reserve := req.quantity - onhand_to_reserve;
    before_json := to_jsonb(lvl);

    update public.inventory_levels il
    set committed = il.committed + onhand_to_reserve,
        backordered = il.backordered + backorder_to_reserve,
        version = il.version + 1
    where il.variant_id = req.stock_variant_id and il.location_id = req.location_id
    returning to_jsonb(il) into after_json;

    insert into public.inventory_movements(
      variant_id, location_id, reason,
      delta_on_hand, delta_committed, delta_backordered,
      before_state, after_state, source_type, source_id, source_reference, idempotency_key, note
    ) values (
      req.stock_variant_id, req.location_id, 'checkout_reserve',
      0, onhand_to_reserve, backorder_to_reserve,
      before_json, after_json, 'checkout_session', s.id, req.line_key,
      'checkout-reserve:' || s.id::text || ':' || req.stock_variant_id::text || ':' || req.location_id::text,
      'Reserved for Stripe Checkout'
    );

    insert into public.inventory_reservations(
      checkout_token, checkout_session_id, source_line_key,
      requested_variant_id, stock_variant_id, location_id, quantity,
      reserved_on_hand, reserved_backordered, status, expires_at
    ) values (
      s.checkout_token, s.id, req.line_key,
      req.requested_variant_id, req.stock_variant_id, req.location_id, req.quantity,
      onhand_to_reserve, backorder_to_reserve, 'active', s.reservation_expires_at
    );
  end loop;

  return jsonb_build_object('status','reserved','checkout_session_id',s.id);
end;
$$;

create or replace function public.mark_checkout_payment_pending(p_checkout_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.checkout_sessions
  set status = 'payment_pending'
  where id = p_checkout_session_id
    and status in ('prepared','stripe_created');

  update public.inventory_reservations
  set status = 'payment_pending'
  where checkout_session_id = p_checkout_session_id
    and status = 'active';
end;
$$;

create or replace function public.release_checkout_inventory(
  p_checkout_session_id uuid,
  p_checkout_status public.checkout_snapshot_status default 'expired'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  lvl public.inventory_levels%rowtype;
  before_json jsonb;
  after_json jsonb;
begin
  if p_checkout_status not in ('expired','payment_failed','cancelled') then
    raise exception 'invalid release checkout status %', p_checkout_status;
  end if;

  perform 1 from public.checkout_sessions where id = p_checkout_session_id for update;
  if not found then raise exception 'checkout session not found'; end if;

  for r in
    select * from public.inventory_reservations
    where checkout_session_id = p_checkout_session_id
      and status in ('active','payment_pending')
    order by stock_variant_id, location_id
    for update
  loop
    select * into lvl from public.inventory_levels
    where variant_id = r.stock_variant_id and location_id = r.location_id
    for update;
    if not found then raise exception 'inventory level missing during release'; end if;

    before_json := to_jsonb(lvl);
    update public.inventory_levels il
    set committed = il.committed - r.reserved_on_hand,
        backordered = il.backordered - r.reserved_backordered,
        version = il.version + 1
    where il.variant_id = r.stock_variant_id and il.location_id = r.location_id
      and il.committed >= r.reserved_on_hand
      and il.backordered >= r.reserved_backordered
    returning to_jsonb(il) into after_json;
    if after_json is null then raise exception 'reservation release would violate inventory state'; end if;

    insert into public.inventory_movements(
      variant_id, location_id, reason, delta_committed, delta_backordered,
      before_state, after_state, source_type, source_id, source_reference, idempotency_key, note
    ) values (
      r.stock_variant_id, r.location_id, 'reservation_release',
      -r.reserved_on_hand, -r.reserved_backordered,
      before_json, after_json, 'checkout_session', p_checkout_session_id, r.source_line_key,
      'checkout-release:' || p_checkout_session_id::text || ':' || r.id::text,
      'Checkout inventory released'
    );

    update public.inventory_reservations
    set status = case when p_checkout_status = 'expired' then 'expired' else 'released' end,
        released_at = now()
    where id = r.id;
  end loop;

  update public.checkout_sessions
  set status = p_checkout_status
  where id = p_checkout_session_id and status <> 'paid';

  return jsonb_build_object('status','released','checkout_session_id',p_checkout_session_id);
end;
$$;

create or replace function public.release_expired_checkout_inventory(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
  n integer := 0;
begin
  for rec in
    select id
    from public.checkout_sessions
    where status in ('prepared','stripe_created')
      and reservation_expires_at <= now()
    order by reservation_expires_at
    limit greatest(1, least(p_limit, 1000))
  loop
    perform public.release_checkout_inventory(rec.id, 'expired');
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.convert_paid_checkout(
  p_checkout_session_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_paid_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.checkout_sessions%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  line record;
  comp record;
  r record;
  lvl public.inventory_levels%rowtype;
  before_json jsonb;
  after_json jsonb;
  v_order_item_id uuid;
  v_component_id uuid;
  v_group_id uuid;
  v_routing public.fulfillment_routing_mode;
begin
  select * into s from public.checkout_sessions where id = p_checkout_session_id for update;
  if not found then raise exception 'checkout session not found'; end if;

  if s.status = 'paid' and s.paid_order_id is not null then
    return s.paid_order_id;
  end if;
  if s.status in ('expired','payment_failed','cancelled') then
    raise exception 'cannot pay checkout in terminal status %', s.status;
  end if;

  if s.stripe_checkout_session_id is not null and s.stripe_checkout_session_id <> p_stripe_checkout_session_id then
    raise exception 'stripe checkout session mismatch';
  end if;

  select id into v_customer_id from public.customers where email = s.customer_email limit 1;
  if v_customer_id is null then
    insert into public.customers(email, first_name, last_name, phone)
    values (
      s.customer_email,
      nullif(s.customer_snapshot->>'first_name',''),
      nullif(s.customer_snapshot->>'last_name',''),
      s.customer_phone
    ) returning id into v_customer_id;
  end if;

  insert into public.orders(
    cart_id, customer_id, customer_email, customer_phone, currency,
    subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents,
    payment_status, fulfillment_status, return_status, refund_status,
    stripe_checkout_session_id, stripe_payment_intent_id,
    customer_snapshot, shipping_address_snapshot, billing_address_snapshot, shipping_method_snapshot,
    placed_at, paid_at
  ) values (
    s.cart_id, v_customer_id, s.customer_email, s.customer_phone, s.currency,
    s.subtotal_cents, s.discount_cents, s.shipping_cents, s.tax_cents, s.total_cents,
    'paid', 'unfulfilled', 'none', 'none',
    p_stripe_checkout_session_id, p_stripe_payment_intent_id,
    s.customer_snapshot, s.shipping_address_snapshot, s.billing_address_snapshot, s.shipping_method_snapshot,
    p_paid_at, p_paid_at
  )
  on conflict (stripe_checkout_session_id) do update
    set stripe_payment_intent_id = excluded.stripe_payment_intent_id
  returning id into v_order_id;

  if exists (select 1 from public.order_items where order_id = v_order_id) then
    update public.checkout_sessions set status='paid', paid_order_id=v_order_id, paid_at=p_paid_at,
      stripe_checkout_session_id=p_stripe_checkout_session_id,
      stripe_payment_intent_id=p_stripe_payment_intent_id
    where id=s.id;
    return v_order_id;
  end if;

  for line in select * from public.checkout_lines where checkout_session_id = s.id order by created_at, id loop
    insert into public.order_items(
      order_id, product_id, variant_id, product_handle_snapshot, product_title_snapshot,
      variant_title_snapshot, sku_snapshot, options_snapshot, display_snapshot,
      fulfillment_mode_snapshot, provider_id_snapshot, quantity,
      unit_price_cents, discount_cents, tax_cents, line_total_cents, is_bundle
    ) values (
      v_order_id, line.product_id, line.variant_id, line.product_handle_snapshot, line.product_title_snapshot,
      line.variant_title_snapshot, line.sku_snapshot, line.options_snapshot, line.display_snapshot,
      line.fulfillment_mode_snapshot, line.provider_id_snapshot, line.quantity,
      line.unit_price_cents, line.discount_cents, line.tax_cents, line.line_total_cents, line.is_bundle
    ) returning id into v_order_item_id;

    for comp in select * from public.checkout_line_components where checkout_line_id = line.id order by id loop
      v_component_id := null;
      if line.is_bundle then
        insert into public.order_item_components(
          order_item_id, component_variant_id, component_title_snapshot, component_sku_snapshot,
          quantity_per_parent, total_quantity, provider_id_snapshot, location_id_snapshot
        ) values (
          v_order_item_id, comp.component_variant_id, comp.component_title_snapshot, comp.component_sku_snapshot,
          comp.quantity_per_parent, comp.total_quantity, comp.provider_id_snapshot, comp.location_id_snapshot
        ) returning id into v_component_id;
      end if;

      if comp.fulfillment_mode_snapshot = 'stocked' then
        v_routing := 'internal';
      elsif comp.fulfillment_mode_snapshot = 'manual_supplier' then
        v_routing := 'manual';
      else
        v_routing := 'automatic';
      end if;

      select fg.id into v_group_id
      from public.fulfillment_groups fg
      where fg.order_id = v_order_id
        and fg.provider_id = comp.provider_id_snapshot
        and fg.location_id is not distinct from comp.location_id_snapshot
        and fg.routing_mode = v_routing
      limit 1;

      if v_group_id is null then
        insert into public.fulfillment_groups(
          order_id, provider_id, location_id, routing_mode, canonical_status,
          auto_submit, effective_shipping_address_snapshot
        ) values (
          v_order_id, comp.provider_id_snapshot, comp.location_id_snapshot, v_routing,
          case when v_routing='internal' then 'accepted'::public.fulfillment_group_status else 'pending_submission'::public.fulfillment_group_status end,
          false, s.shipping_address_snapshot
        ) returning id into v_group_id;
      end if;

      insert into public.fulfillment_group_items(
        fulfillment_group_id, order_item_id, order_item_component_id, variant_id,
        quantity_required, quantity_fulfilled
      ) values (
        v_group_id, v_order_item_id, v_component_id, comp.component_variant_id,
        comp.total_quantity, 0
      );
    end loop;
  end loop;

  for r in
    select * from public.inventory_reservations
    where checkout_session_id=s.id and status in ('active','payment_pending')
    order by stock_variant_id, location_id
    for update
  loop
    select * into lvl from public.inventory_levels
    where variant_id=r.stock_variant_id and location_id=r.location_id for update;
    if not found then raise exception 'inventory level missing during paid conversion'; end if;
    before_json := to_jsonb(lvl);

    update public.inventory_levels il
    set on_hand = il.on_hand - r.reserved_on_hand,
        committed = il.committed - r.reserved_on_hand,
        backordered = il.backordered - r.reserved_backordered,
        version = il.version + 1
    where il.variant_id=r.stock_variant_id and il.location_id=r.location_id
      and il.on_hand >= r.reserved_on_hand
      and il.committed >= r.reserved_on_hand
      and il.backordered >= r.reserved_backordered
    returning to_jsonb(il) into after_json;
    if after_json is null then raise exception 'paid conversion would violate inventory state'; end if;

    insert into public.inventory_movements(
      variant_id, location_id, reason, delta_on_hand, delta_committed, delta_backordered,
      before_state, after_state, source_type, source_id, source_reference, idempotency_key, note
    ) values (
      r.stock_variant_id, r.location_id, 'order_sale',
      -r.reserved_on_hand, -r.reserved_on_hand, -r.reserved_backordered,
      before_json, after_json, 'order', v_order_id, r.source_line_key,
      'paid-convert:' || s.id::text || ':' || r.id::text,
      'Converted reserved stock after verified payment'
    );

    update public.inventory_reservations
    set status='converted', converted_order_id=v_order_id, converted_at=p_paid_at
    where id=r.id;
  end loop;

  insert into public.payments(
    order_id, provider, external_payment_intent_id, status,
    amount_authorized_cents, amount_captured_cents, amount_refunded_cents, currency, raw_status
  ) values (
    v_order_id, 'stripe', p_stripe_payment_intent_id, 'paid',
    s.total_cents, s.total_cents, 0, s.currency, 'paid'
  ) on conflict (external_payment_intent_id) do nothing;

  insert into public.supplier_tasks(fulfillment_group_id, status, ordering_url_snapshot, expected_cost_cents, currency)
  select fg.id, 'required', fp.ordering_url, fg.estimated_cost_cents, fg.currency
  from public.fulfillment_groups fg
  join public.fulfillment_providers fp on fp.id=fg.provider_id
  where fg.order_id=v_order_id and fg.routing_mode='manual'
  on conflict (fulfillment_group_id) do nothing;

  update public.checkout_sessions
  set status='paid', paid_order_id=v_order_id, paid_at=p_paid_at,
      stripe_checkout_session_id=p_stripe_checkout_session_id,
      stripe_payment_intent_id=p_stripe_payment_intent_id
  where id=s.id;

  if s.cart_id is not null then
    update public.carts set status='converted', converted_order_id=v_order_id where id=s.cart_id;
  end if;

  return v_order_id;
end;
$$;

create or replace function public.studio_adjust_inventory(
  p_variant_id uuid,
  p_location_id uuid,
  p_delta_on_hand integer,
  p_reason public.inventory_reason,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  lvl public.inventory_levels%rowtype;
  before_json jsonb;
  after_json jsonb;
begin
  if not (select private.is_studio_owner()) then raise exception 'studio owner required'; end if;
  if p_delta_on_hand = 0 then raise exception 'inventory adjustment delta cannot be zero'; end if;
  if p_reason in ('checkout_reserve','reservation_release','order_sale') then
    raise exception 'system inventory reason cannot be used for manual adjustment';
  end if;

  select * into lvl from public.inventory_levels
  where variant_id=p_variant_id and location_id=p_location_id for update;
  if not found then raise exception 'inventory level not found'; end if;
  if lvl.on_hand + p_delta_on_hand < lvl.committed + lvl.unavailable then
    raise exception 'adjustment would make on_hand lower than committed + unavailable';
  end if;

  before_json := to_jsonb(lvl);
  update public.inventory_levels il
  set on_hand=il.on_hand+p_delta_on_hand, version=il.version+1
  where il.variant_id=p_variant_id and il.location_id=p_location_id
  returning to_jsonb(il) into after_json;

  insert into public.inventory_movements(
    variant_id, location_id, reason, delta_on_hand,
    before_state, after_state, source_type, actor_user_id, note
  ) values (
    p_variant_id, p_location_id, p_reason, p_delta_on_hand,
    before_json, after_json, 'studio_manual', (select auth.uid()), p_note
  );

  return after_json;
end;
$$;

revoke execute on function public.claim_stripe_event(text,text,text) from public, anon, authenticated;
revoke execute on function public.finish_stripe_event(text,text,text) from public, anon, authenticated;
revoke execute on function public.reserve_checkout_inventory(uuid) from public, anon, authenticated;
revoke execute on function public.mark_checkout_payment_pending(uuid) from public, anon, authenticated;
revoke execute on function public.release_checkout_inventory(uuid,public.checkout_snapshot_status) from public, anon, authenticated;
revoke execute on function public.release_expired_checkout_inventory(integer) from public, anon, authenticated;
revoke execute on function public.convert_paid_checkout(uuid,text,text,timestamptz) from public, anon, authenticated;
revoke execute on function public.studio_adjust_inventory(uuid,uuid,integer,public.inventory_reason,text) from public, anon;

grant execute on function public.claim_stripe_event(text,text,text) to service_role;
grant execute on function public.finish_stripe_event(text,text,text) to service_role;
grant execute on function public.reserve_checkout_inventory(uuid) to service_role;
grant execute on function public.mark_checkout_payment_pending(uuid) to service_role;
grant execute on function public.release_checkout_inventory(uuid,public.checkout_snapshot_status) to service_role;
grant execute on function public.release_expired_checkout_inventory(integer) to service_role;
grant execute on function public.convert_paid_checkout(uuid,text,text,timestamptz) to service_role;
grant execute on function public.studio_adjust_inventory(uuid,uuid,integer,public.inventory_reason,text) to authenticated, service_role;


-- Migration 0009: Data API grants and row-level security.

-- Public storefront browsers receive no direct table grants. Next.js server code serves storefront data.

revoke all on all tables in schema public from anon, authenticated;

revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;

grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.next_bad_era_support_number() to authenticated;
grant execute on function public.next_bad_era_order_number() to service_role;
grant execute on function public.next_bad_era_return_number() to service_role;
grant execute on function public.next_bad_era_support_number() to service_role;
grant execute on function public.studio_adjust_inventory(uuid,uuid,integer,public.inventory_reason,text) to authenticated;

alter default privileges in schema public revoke all on tables from anon;

alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

alter table public.studio_users enable row level security;

create policy "studio owner all" on public.studio_users
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.fulfillment_providers enable row level security;

create policy "studio owner all" on public.fulfillment_providers
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.inventory_locations enable row level security;

create policy "studio owner all" on public.inventory_locations
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.media_assets enable row level security;

create policy "studio owner all" on public.media_assets
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.products enable row level security;

create policy "studio owner all" on public.products
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.product_options enable row level security;

create policy "studio owner all" on public.product_options
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.product_option_values enable row level security;

create policy "studio owner all" on public.product_option_values
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.product_variants enable row level security;

create policy "studio owner all" on public.product_variants
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.variant_option_values enable row level security;

create policy "studio owner all" on public.variant_option_values
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.variant_financials enable row level security;

create policy "studio owner all" on public.variant_financials
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.product_media enable row level security;

create policy "studio owner all" on public.product_media
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.collections enable row level security;

create policy "studio owner all" on public.collections
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.collection_products enable row level security;

create policy "studio owner all" on public.collection_products
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.bundle_components enable row level security;

create policy "studio owner all" on public.bundle_components
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.provider_variant_mappings enable row level security;

create policy "studio owner all" on public.provider_variant_mappings
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.provider_variant_availability enable row level security;

create policy "studio owner all" on public.provider_variant_availability
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.customers enable row level security;

create policy "studio owner all" on public.customers
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.customer_addresses enable row level security;

create policy "studio owner all" on public.customer_addresses
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.carts enable row level security;

create policy "studio owner all" on public.carts
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.cart_items enable row level security;

create policy "studio owner all" on public.cart_items
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.inventory_levels enable row level security;

create policy "studio owner all" on public.inventory_levels
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.inventory_movements enable row level security;

create policy "studio owner all" on public.inventory_movements
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.inventory_reservations enable row level security;

create policy "studio owner all" on public.inventory_reservations
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.orders enable row level security;

create policy "studio owner all" on public.orders
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.order_items enable row level security;

create policy "studio owner all" on public.order_items
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.order_item_components enable row level security;

create policy "studio owner all" on public.order_item_components
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.payments enable row level security;

create policy "studio owner all" on public.payments
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.stripe_events enable row level security;

create policy "studio owner all" on public.stripe_events
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.fulfillment_groups enable row level security;

create policy "studio owner all" on public.fulfillment_groups
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.fulfillment_group_items enable row level security;

create policy "studio owner all" on public.fulfillment_group_items
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.provider_events enable row level security;

create policy "studio owner all" on public.provider_events
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.provider_attempts enable row level security;

create policy "studio owner all" on public.provider_attempts
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.supplier_tasks enable row level security;

create policy "studio owner all" on public.supplier_tasks
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.fulfillment_issues enable row level security;

create policy "studio owner all" on public.fulfillment_issues
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.fulfillment_recovery_attempts enable row level security;

create policy "studio owner all" on public.fulfillment_recovery_attempts
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.fulfillment_routing_overrides enable row level security;

create policy "studio owner all" on public.fulfillment_routing_overrides
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.fulfillment_address_corrections enable row level security;

create policy "studio owner all" on public.fulfillment_address_corrections
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.customer_fulfillment_consents enable row level security;

create policy "studio owner all" on public.customer_fulfillment_consents
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.shipments enable row level security;

create policy "studio owner all" on public.shipments
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.shipment_items enable row level security;

create policy "studio owner all" on public.shipment_items
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.refunds enable row level security;

create policy "studio owner all" on public.refunds
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.refund_items enable row level security;

create policy "studio owner all" on public.refund_items
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.returns enable row level security;

create policy "studio owner all" on public.returns
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.return_items enable row level security;

create policy "studio owner all" on public.return_items
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.support_cases enable row level security;

create policy "studio owner all" on public.support_cases
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.support_messages enable row level security;

create policy "studio owner all" on public.support_messages
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.support_notes enable row level security;

create policy "studio owner all" on public.support_notes
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.pages enable row level security;

create policy "studio owner all" on public.pages
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.page_revisions enable row level security;

create policy "studio owner all" on public.page_revisions
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.page_sections enable row level security;

create policy "studio owner all" on public.page_sections
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.page_drafts enable row level security;

create policy "studio owner all" on public.page_drafts
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.navigation_items enable row level security;

create policy "studio owner all" on public.navigation_items
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.site_settings enable row level security;

create policy "studio owner all" on public.site_settings
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.publish_sets enable row level security;

create policy "studio owner all" on public.publish_sets
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.publish_set_items enable row level security;

create policy "studio owner all" on public.publish_set_items
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.media_asset_usages enable row level security;

create policy "studio owner all" on public.media_asset_usages
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.audit_events enable row level security;

create policy "studio owner all" on public.audit_events
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.integration_events enable row level security;

create policy "studio owner all" on public.integration_events
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.idempotency_records enable row level security;

create policy "studio owner all" on public.idempotency_records
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.checkout_sessions enable row level security;

create policy "studio owner all" on public.checkout_sessions
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.checkout_lines enable row level security;

create policy "studio owner all" on public.checkout_lines
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));

alter table public.checkout_line_components enable row level security;

create policy "studio owner all" on public.checkout_line_components
for all to authenticated
using ((select private.is_studio_owner()))
with check ((select private.is_studio_owner()));


-- Customer profile and address ownership.
create policy "customer reads own profile" on public.customers
for select to authenticated
using (auth_user_id = (select auth.uid()));
create policy "customer updates own profile" on public.customers
for update to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));

create policy "customer manages own addresses" on public.customer_addresses
for all to authenticated
using (customer_id = (select private.current_customer_id()))
with check (customer_id = (select private.current_customer_id()));

-- Historical order/account reads.
create policy "customer reads own orders" on public.orders
for select to authenticated
using (customer_id = (select private.current_customer_id()));

create policy "customer reads own order items" on public.order_items
for select to authenticated
using (exists (
  select 1 from public.orders o
  where o.id = order_items.order_id
    and o.customer_id = (select private.current_customer_id())
));

create policy "customer reads own bundle components" on public.order_item_components
for select to authenticated
using (exists (
  select 1 from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.id = order_item_components.order_item_id
    and o.customer_id = (select private.current_customer_id())
));

create policy "customer reads own refunds" on public.refunds
for select to authenticated
using (exists (
  select 1 from public.orders o
  where o.id = refunds.order_id
    and o.customer_id = (select private.current_customer_id())
));

create policy "customer reads own refund items" on public.refund_items
for select to authenticated
using (exists (
  select 1 from public.refunds r
  join public.orders o on o.id = r.order_id
  where r.id = refund_items.refund_id
    and o.customer_id = (select private.current_customer_id())
));

create policy "customer reads own returns" on public.returns
for select to authenticated
using (customer_id = (select private.current_customer_id()));

create policy "customer reads own return items" on public.return_items
for select to authenticated
using (exists (
  select 1 from public.returns r
  where r.id = return_items.return_id
    and r.customer_id = (select private.current_customer_id())
));

create policy "customer reads own support cases" on public.support_cases
for select to authenticated
using (customer_id = (select private.current_customer_id()));

create policy "customer creates own support cases" on public.support_cases
for insert to authenticated
with check (customer_id = (select private.current_customer_id()));

create policy "customer reads own support messages" on public.support_messages
for select to authenticated
using (exists (
  select 1 from public.support_cases sc
  where sc.id = support_messages.case_id
    and sc.customer_id = (select private.current_customer_id())
    and support_messages.customer_visible = true
));

create policy "customer creates own support messages" on public.support_messages
for insert to authenticated
with check (
  author_type = 'customer'
  and author_user_id = (select auth.uid())
  and customer_visible = true
  and exists (
    select 1 from public.support_cases sc
    where sc.id = support_messages.case_id
      and sc.customer_id = (select private.current_customer_id())
  )
);

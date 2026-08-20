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

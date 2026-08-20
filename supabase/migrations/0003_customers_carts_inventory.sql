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

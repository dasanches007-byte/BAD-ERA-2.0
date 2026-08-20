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

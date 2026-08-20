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

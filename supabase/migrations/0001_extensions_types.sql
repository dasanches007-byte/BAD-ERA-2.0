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

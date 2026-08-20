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

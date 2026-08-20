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

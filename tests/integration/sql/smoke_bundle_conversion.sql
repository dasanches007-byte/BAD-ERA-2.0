-- Acceptance case 8 (ACCEPTANCE_MATRIX.md):
--   "Bundle S/Blue payment decrements Tee/S and Crossbody/Blue, never a bundle stock row."
-- Plus case 7: duplicate/concurrent paid events return the same order.
-- Run against a database with migrations 0001-0009 and seed.sql applied.

\set ON_ERROR_STOP on
\pset footer off

do $$
declare
  v_bundle_variant uuid;
  v_tee_m uuid;
  v_bag_blue uuid;
  v_loc uuid;
  v_provider uuid;
  v_checkout uuid;
  v_line uuid;
  v_order uuid;
  v_order2 uuid;
  v_tee_before int; v_bag_before int;
  v_tee_after int;  v_bag_after int;
  v_cs text; v_pi text;
begin
  -- Unique Stripe identifiers so the test is repeatable against one database.
  v_cs := 'cs_test_smoke_' || substr(md5(random()::text), 1, 12);
  v_pi := 'pi_test_smoke_' || substr(md5(random()::text), 1, 12);
  select id into v_loc from public.inventory_locations limit 1;
  select id into v_provider from public.fulfillment_providers where connection_mode = 'internal' limit 1;

  -- Original Era Set, Medium + Blue
  select v.id into v_bundle_variant
  from public.product_variants v join public.products p on p.id = v.product_id
  where p.kind = 'bundle' and v.title ilike '%M%' and v.title ilike '%Blue%' limit 1;

  select v.id into v_tee_m from public.product_variants v join public.products p on p.id=v.product_id
  where p.title = 'BAD ERA Original Tee' and v.title ilike '%M%' limit 1;
  select v.id into v_bag_blue from public.product_variants v join public.products p on p.id=v.product_id
  where p.title = 'BAD ERA Original Crossbody' and v.title ilike '%Blue%' limit 1;

  select available into v_tee_before from public.inventory_levels where variant_id = v_tee_m;
  select available into v_bag_before from public.inventory_levels where variant_id = v_bag_blue;
  raise notice 'before: tee/M=% bag/Blue=%', v_tee_before, v_bag_before;

  insert into public.checkout_sessions (
    customer_email, shipping_address_snapshot, subtotal_cents, total_cents, reservation_expires_at,
    stripe_checkout_session_id
  ) values (
    'smoke@example.test',
    '{"name":"Smoke Test","line1":"1 Test St","city":"Los Angeles","state":"CA","postal_code":"90001","country":"US"}'::jsonb,
    4500, 4500, now() + interval '30 minutes', v_cs
  ) returning id into v_checkout;

  insert into public.checkout_lines (
    checkout_session_id, line_key, product_id, variant_id,
    product_handle_snapshot, product_title_snapshot, variant_title_snapshot,
    fulfillment_mode_snapshot, provider_id_snapshot,
    quantity, unit_price_cents, line_total_cents, is_bundle
  )
  select v_checkout, 'era-set-m-blue', v.product_id, v.id,
         'original-era-set', 'Original Era Set', v.title,
         'stocked', v_provider, 1, 4500, 4500, true
  from public.product_variants v where v.id = v_bundle_variant
  returning id into v_line;

  -- Components resolve to the PHYSICAL variants, never the bundle.
  insert into public.checkout_line_components (
    checkout_line_id, component_variant_id, component_title_snapshot,
    fulfillment_mode_snapshot, provider_id_snapshot, location_id_snapshot,
    quantity_per_parent, total_quantity
  ) values
    (v_line, v_tee_m,    'Original Tee / M',        'stocked', v_provider, v_loc, 1, 1),
    (v_line, v_bag_blue, 'Original Crossbody / Blue','stocked', v_provider, v_loc, 1, 1);

  perform public.reserve_checkout_inventory(v_checkout);
  raise notice 'reserved';

  update public.checkout_sessions set status='stripe_created' where id = v_checkout;

  v_order := public.convert_paid_checkout(v_checkout, v_cs, v_pi);
  raise notice 'order created: %', v_order;

  -- Case 7: replaying the same paid event must return the SAME order.
  v_order2 := public.convert_paid_checkout(v_checkout, v_cs, v_pi);
  raise notice 'replayed conversion returned: %', v_order2;

  select available into v_tee_after from public.inventory_levels where variant_id = v_tee_m;
  select available into v_bag_after from public.inventory_levels where variant_id = v_bag_blue;
  raise notice 'after: tee/M=% bag/Blue=%', v_tee_after, v_bag_after;

  if v_order2 is distinct from v_order then
    raise exception 'FAIL case 7: duplicate conversion created a second order (% vs %)', v_order, v_order2;
  end if;
  if v_tee_after <> v_tee_before - 1 then
    raise exception 'FAIL case 8: tee/M expected % got %', v_tee_before - 1, v_tee_after;
  end if;
  if v_bag_after <> v_bag_before - 1 then
    raise exception 'FAIL case 8: bag/Blue expected % got %', v_bag_before - 1, v_bag_after;
  end if;
  if exists (select 1 from public.inventory_levels where variant_id = v_bundle_variant) then
    raise exception 'FAIL case 8: a stock row exists for the bundle variant';
  end if;

  raise notice 'PASS: cases 7 and 8';
end $$;

-- Report what the order actually recorded.
select o.order_number, o.payment_status::text, o.fulfillment_status::text, o.total_cents
from public.orders o order by o.created_at desc limit 1;

select oi.product_title_snapshot || ' / ' || oi.variant_title_snapshot as order_line,
       oi.quantity, oi.is_bundle,
       (select string_agg(c.component_title_snapshot || ' x' || c.total_quantity, ', ')
        from public.order_item_components c where c.order_item_id = oi.id) as components
from public.order_items oi order by oi.created_at desc limit 1;

select v.title as variant, m.reason::text,
       m.delta_on_hand, m.delta_committed
from public.inventory_movements m join public.product_variants v on v.id = m.variant_id
order by m.created_at desc, v.title limit 4;

-- ============================================================================
-- Migration 0017: Studio can create products, and can change stock
--
-- Two things the owner could not do, found while mapping the site for them:
--
-- 1. CHANGE STOCK. `studio_adjust_inventory` (0008) proves ownership with
--    `private.is_studio_owner()`, which reads `auth.uid()`. Migration 0014
--    revoked the function from `authenticated`, so both callers (Studio
--    inventory, return restock) use the service-role client — and a
--    service-role request carries no user, so `auth.uid()` is null and every
--    call raised "studio owner required". No stock count could ever be
--    entered from Studio. The movement's `actor_user_id` was null for the same
--    reason, so even a working call would have lost who made it.
--
--    The fix keeps the database as the real boundary. The trusted server
--    names the actor it has already authorized; the database re-checks that
--    actor against `studio_users` and records them on the movement. An
--    end-user token can only ever act as itself, so a future grant to
--    `authenticated` could not be used to impersonate the owner.
--
-- 2. CREATE A PRODUCT. Studio could edit products but had no way to make one,
--    and the live store has none. A product is ten-odd rows across seven
--    tables (product, options, option values, variants, their option links,
--    stock levels, the starting-stock movements, bundle components). Written
--    as separate PostgREST calls, a failure halfway would leave a product with
--    missing variants or variants with no stock row — which checkout then
--    refuses with "inventory level missing". `studio_create_product` writes
--    the whole thing in one transaction or nothing at all.
--
--    Rules it holds, whatever the caller sends:
--      - a new product is always a DRAFT; going live is a separate decision
--      - sizes are S / M / L / XL only, never 2XL (Master Spec)
--      - starting stock is an audited `initial_stock` movement, not a bare
--        number, exactly like every later change
--      - a set (bundle) never holds stock of its own: it gets no stock row,
--        and each of its options names the real variants it is made from
--      - set pieces must be active variants of single (non-set) products
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Who is acting. One rule for every owner-only function in this migration.
-- ---------------------------------------------------------------------------
create or replace function private.resolve_studio_owner(p_actor uuid)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_role text := (select auth.role());
  v_uid uuid := (select auth.uid());
  v_actor uuid;
begin
  if v_role is null or v_role = 'service_role' then
    -- Trusted server code (or a direct database session): it has already
    -- authorized the owner and names them here.
    v_actor := coalesce(p_actor, v_uid);
  else
    -- An end-user token acts as itself and nobody else.
    if p_actor is not null and p_actor is distinct from v_uid then
      raise exception 'studio owner required' using errcode = '42501';
    end if;
    v_actor := v_uid;
  end if;

  if v_actor is null or not exists (
    select 1
      from public.studio_users su
     where su.user_id = v_actor
       and su.active = true
       and su.role = 'owner'
  ) then
    raise exception 'studio owner required' using errcode = '42501';
  end if;

  return v_actor;
end;
$$;

revoke execute on function private.resolve_studio_owner(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. studio_adjust_inventory, with a named actor
-- ---------------------------------------------------------------------------
-- Dropped rather than overloaded: two functions of the same name that differ
-- only by a defaulted argument are ambiguous to PostgREST.
drop function if exists public.studio_adjust_inventory(uuid, uuid, integer, public.inventory_reason, text);

create function public.studio_adjust_inventory(
  p_variant_id uuid,
  p_location_id uuid,
  p_delta_on_hand integer,
  p_reason public.inventory_reason,
  p_note text default null,
  p_actor uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  lvl public.inventory_levels%rowtype;
  before_json jsonb;
  after_json jsonb;
begin
  v_actor := private.resolve_studio_owner(p_actor);

  if p_delta_on_hand = 0 then raise exception 'inventory adjustment delta cannot be zero'; end if;
  if p_reason in ('checkout_reserve','reservation_release','order_sale') then
    raise exception 'system inventory reason cannot be used for manual adjustment';
  end if;

  select * into lvl from public.inventory_levels
  where variant_id = p_variant_id and location_id = p_location_id for update;
  if not found then raise exception 'inventory level not found'; end if;
  if lvl.on_hand + p_delta_on_hand < lvl.committed + lvl.unavailable then
    raise exception 'adjustment would make on_hand lower than committed + unavailable';
  end if;

  before_json := to_jsonb(lvl);
  update public.inventory_levels il
  set on_hand = il.on_hand + p_delta_on_hand, version = il.version + 1
  where il.variant_id = p_variant_id and il.location_id = p_location_id
  returning to_jsonb(il) into after_json;

  insert into public.inventory_movements(
    variant_id, location_id, reason, delta_on_hand,
    before_state, after_state, source_type, actor_user_id, note
  ) values (
    p_variant_id, p_location_id, p_reason, p_delta_on_hand,
    before_json, after_json, 'studio_manual', v_actor, p_note
  );

  return after_json;
end;
$$;

revoke execute on function public.studio_adjust_inventory(uuid, uuid, integer, public.inventory_reason, text, uuid)
  from public, anon, authenticated;
grant execute on function public.studio_adjust_inventory(uuid, uuid, integer, public.inventory_reason, text, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. studio_create_product
-- ---------------------------------------------------------------------------
-- p_product:
--   {
--     "handle": "bad-era-original-tee",       lower-case words and hyphens
--     "title": "BAD ERA Original Tee",
--     "subtitle": "Black", "description": null, "product_type": "Tee",
--     "tags": ["archive-01"],
--     "kind": "standard" | "bundle",
--     "options":  [ { "name": "Size", "values": ["S","M","L"] } ],   0-3 options
--     "variants": [ {
--         "option_values": ["S"],                one value per option, in order
--         "title": "S", "price_cents": 3000, "sku": null,
--         "starting_stock": 12,                  single products only
--         "components": [ { "variant_id": "...", "quantity": 1 } ]   sets only
--     } ]
--   }
-- Returns the new product's id.
create or replace function public.studio_create_product(
  p_product jsonb,
  p_actor uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_kind public.product_kind;
  v_handle text := btrim(coalesce(p_product->>'handle', ''));
  v_title text := btrim(coalesce(p_product->>'title', ''));
  v_options jsonb := coalesce(p_product->'options', '[]'::jsonb);
  v_variants jsonb := coalesce(p_product->'variants', '[]'::jsonb);
  v_option_count integer;
  v_product uuid;
  v_location uuid;
  v_provider uuid;
  v_option jsonb;
  v_option_id uuid;
  v_option_ids uuid[] := '{}';
  v_option_names text[] := '{}';
  v_name text;
  v_value text;
  v_value_id uuid;
  v_variant jsonb;
  v_variant_id uuid;
  v_variant_title text;
  v_values jsonb;
  v_price bigint;
  v_stock integer;
  v_component jsonb;
  v_component_id uuid;
  v_quantity integer;
  v_seen text[] := '{}';
  lvl public.inventory_levels%rowtype;
  before_json jsonb;
  after_json jsonb;
begin
  v_actor := private.resolve_studio_owner(p_actor);

  if v_title = '' then
    raise exception 'A product needs a name.' using errcode = '22023';
  end if;
  if v_handle !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'The web address must be lower-case words separated by hyphens.' using errcode = '22023';
  end if;

  v_kind := coalesce(nullif(p_product->>'kind', ''), 'standard')::public.product_kind;

  if jsonb_typeof(v_options) <> 'array' or jsonb_array_length(v_options) > 3 then
    raise exception 'A product can have up to three options.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_variants) <> 'array' or jsonb_array_length(v_variants) = 0 then
    raise exception 'A product needs at least one variant.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_variants) > 100 then
    raise exception 'A product can have up to 100 variants.' using errcode = '22023';
  end if;
  v_option_count := jsonb_array_length(v_options);

  -- Stock lives where checkout looks for it: the first active location that
  -- fulfils online orders (src/lib/checkout/create-checkout.ts).
  select l.id, l.provider_id
    into v_location, v_provider
    from public.inventory_locations l
   where l.active = true
     and l.fulfills_online_orders = true
   order by l.created_at
   limit 1;
  if v_location is null then
    raise exception 'No active stock location is set up.' using errcode = 'P0002';
  end if;

  insert into public.products (handle, title, subtitle, description, product_type, tags, status, kind)
  values (
    v_handle,
    v_title,
    nullif(btrim(coalesce(p_product->>'subtitle', '')), ''),
    nullif(btrim(coalesce(p_product->>'description', '')), ''),
    nullif(btrim(coalesce(p_product->>'product_type', '')), ''),
    coalesce(
      (select array_agg(btrim(t))
         from jsonb_array_elements_text(coalesce(p_product->'tags', '[]'::jsonb)) t
        where btrim(t) <> ''),
      '{}'::text[]
    ),
    'draft',
    v_kind
  )
  returning id into v_product;

  -- Options and their values.
  for i in 0 .. v_option_count - 1 loop
    v_option := v_options->i;
    v_name := btrim(coalesce(v_option->>'name', ''));
    if v_name = '' then
      raise exception 'Every option needs a name.' using errcode = '22023';
    end if;
    if lower(v_name) = any (select lower(n) from unnest(v_option_names) n) then
      raise exception 'Two options are both called "%".', v_name using errcode = '22023';
    end if;
    if jsonb_typeof(v_option->'values') is distinct from 'array'
       or jsonb_array_length(v_option->'values') = 0 then
      raise exception 'The option "%" needs at least one choice.', v_name using errcode = '22023';
    end if;

    insert into public.product_options (product_id, name, position)
    values (v_product, v_name, i)
    returning id into v_option_id;

    for j in 0 .. jsonb_array_length(v_option->'values') - 1 loop
      v_value := btrim(coalesce(v_option->'values'->>j, ''));
      if v_value = '' then
        raise exception 'The option "%" has an empty choice.', v_name using errcode = '22023';
      end if;
      -- Apparel sizes are S / M / L / XL only. 2XL is superseded and invalid.
      if v_name ~* '(^|\s)size$' and v_value not in ('S', 'M', 'L', 'XL') then
        raise exception 'Sizes are S, M, L or XL only — "%" is not allowed.', v_value using errcode = '22023';
      end if;
      insert into public.product_option_values (option_id, value, position)
      values (v_option_id, v_value, j);
    end loop;

    v_option_ids := v_option_ids || v_option_id;
    v_option_names := v_option_names || v_name;
  end loop;

  -- Variants.
  for i in 0 .. jsonb_array_length(v_variants) - 1 loop
    v_variant := v_variants->i;
    v_values := coalesce(v_variant->'option_values', '[]'::jsonb);

    if jsonb_typeof(v_values) <> 'array' or jsonb_array_length(v_values) <> v_option_count then
      raise exception 'Each variant must pick one choice for every option.' using errcode = '22023';
    end if;
    if v_values::text = any (v_seen) then
      raise exception 'Two variants have the same choices.' using errcode = '22023';
    end if;
    v_seen := v_seen || v_values::text;

    v_price := (v_variant->>'price_cents')::bigint;
    if v_price is null or v_price < 0 then
      raise exception 'Every variant needs a price of zero or more.' using errcode = '22023';
    end if;

    v_variant_title := btrim(coalesce(v_variant->>'title', ''));
    if v_variant_title = '' then
      v_variant_title := coalesce(
        (select string_agg(btrim(x.value), ' / ' order by x.ordinality)
           from jsonb_array_elements_text(v_values) with ordinality x(value, ordinality)),
        'Default'
      );
    end if;

    insert into public.product_variants (
      product_id, title, sku, price_cents, inventory_mode, fulfillment_provider_id,
      track_inventory, continue_selling_when_out_of_stock, low_stock_threshold,
      position, is_default
    ) values (
      v_product, v_variant_title, nullif(btrim(coalesce(v_variant->>'sku', '')), ''), v_price,
      'stocked', v_provider,
      true, false, case when v_kind = 'bundle' then 0 else 5 end,
      i, i = 0
    )
    returning id into v_variant_id;

    for j in 0 .. v_option_count - 1 loop
      select v.id
        into v_value_id
        from public.product_option_values v
       where v.option_id = v_option_ids[j + 1]
         and v.value = btrim(coalesce(v_values->>j, ''));
      if not found then
        raise exception 'A variant uses "%", which is not a choice of "%".',
          v_values->>j, v_option_names[j + 1] using errcode = '22023';
      end if;
      insert into public.variant_option_values (variant_id, option_id, option_value_id)
      values (v_variant_id, v_option_ids[j + 1], v_value_id);
    end loop;

    v_stock := coalesce((v_variant->>'starting_stock')::integer, 0);

    if v_kind = 'standard' then
      if jsonb_array_length(coalesce(v_variant->'components', '[]'::jsonb)) > 0 then
        raise exception 'Only a set is made of other products.' using errcode = '22023';
      end if;
      if v_stock < 0 then
        raise exception 'Starting stock cannot be negative.' using errcode = '22023';
      end if;

      -- Every single-product variant gets its stock row, even at zero, so it
      -- can be counted later and checkout can reserve it.
      insert into public.inventory_levels (variant_id, location_id)
      values (v_variant_id, v_location)
      returning * into lvl;

      if v_stock > 0 then
        before_json := to_jsonb(lvl);
        update public.inventory_levels il
           set on_hand = il.on_hand + v_stock, version = il.version + 1
         where il.variant_id = v_variant_id and il.location_id = v_location
        returning to_jsonb(il) into after_json;

        insert into public.inventory_movements (
          variant_id, location_id, reason, delta_on_hand,
          before_state, after_state, source_type, source_id, actor_user_id, note
        ) values (
          v_variant_id, v_location, 'initial_stock', v_stock,
          before_json, after_json, 'studio_create_product', v_product, v_actor, 'Starting stock'
        );
      end if;
    else
      if v_stock <> 0 then
        raise exception 'A set never holds stock of its own.' using errcode = '22023';
      end if;
      if jsonb_typeof(v_variant->'components') is distinct from 'array'
         or jsonb_array_length(v_variant->'components') = 0 then
        raise exception 'Each choice of a set must say which pieces it is made of.' using errcode = '22023';
      end if;

      for v_component in select c.value from jsonb_array_elements(v_variant->'components') c loop
        v_component_id := (v_component->>'variant_id')::uuid;
        v_quantity := coalesce((v_component->>'quantity')::integer, 1);
        if v_quantity < 1 then
          raise exception 'A set needs at least one of each piece.' using errcode = '22023';
        end if;
        if not exists (
          select 1
            from public.product_variants pv
            join public.products pr on pr.id = pv.product_id
           where pv.id = v_component_id
             and pv.active = true
             and pr.kind = 'standard'
             and pr.archived_at is null
        ) then
          raise exception 'A set can only be made of active single products.' using errcode = '22023';
        end if;
        insert into public.bundle_components (bundle_variant_id, component_variant_id, quantity_required)
        values (v_variant_id, v_component_id, v_quantity);
      end loop;
    end if;
  end loop;

  return v_product;
end;
$$;

comment on function public.studio_create_product(jsonb, uuid) is
  'Creates a draft product with its options, variants, stock rows, starting-stock movements and set components in one transaction. Owner only.';

revoke execute on function public.studio_create_product(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.studio_create_product(jsonb, uuid) to service_role;

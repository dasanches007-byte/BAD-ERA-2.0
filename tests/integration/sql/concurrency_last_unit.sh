#!/usr/bin/env bash
# Acceptance case 1: two concurrent reservation attempts for the last unit.
# Exactly one must succeed when continue-selling is OFF.
#
# Needs two real connections, so this runs outside acceptance.sql.
set -euo pipefail

PGPORT="${PGPORT:-5433}"
PGHOST="${PGHOST:-/tmp}"
Q() { psql -h "$PGHOST" -p "$PGPORT" -U postgres -X -A -t -q -v ON_ERROR_STOP=1 "$@"; }

# Force the Tee / L pool down to a single unit.
TEE=$(Q -c "select v.id from product_variants v join products p on p.id=v.product_id
            where p.title='BAD ERA Original Tee' and v.title ilike '%L%' limit 1;")
Q -c "update inventory_levels set on_hand = committed + 1 where variant_id = '$TEE';" > /dev/null
AVAIL=$(Q -c "select available from inventory_levels where variant_id='$TEE';")
echo "  last unit staged: available=$AVAIL"
[ "$AVAIL" = "1" ] || { echo "  FAIL: could not stage exactly 1 unit"; exit 1; }

# Build two independent checkouts for that same unit.
mk_checkout() {
  Q <<SQL
with loc as (select id from inventory_locations where active and fulfills_online_orders order by created_at limit 1),
     prov as (select id from fulfillment_providers where connection_mode='internal' limit 1),
     v as (select pv.*, p.handle, p.title as ptitle from product_variants pv join products p on p.id=pv.product_id where pv.id='$TEE'),
     cs as (
       insert into checkout_sessions (customer_email, shipping_address_snapshot, subtotal_cents, total_cents,
                                      reservation_expires_at, stripe_checkout_session_id)
       values ('race@example.test','{"name":"Race","line1":"1 Test St","city":"LA","state":"CA","postal_code":"90001","country":"US"}'::jsonb,
               3000, 3000, now() + interval '30 minutes', 'cs_race_' || substr(md5(random()::text),1,16))
       returning id
     ),
     cl as (
       insert into checkout_lines (checkout_session_id, line_key, product_id, variant_id,
              product_handle_snapshot, product_title_snapshot, variant_title_snapshot,
              fulfillment_mode_snapshot, provider_id_snapshot, quantity, unit_price_cents, line_total_cents)
       select cs.id, 'race', v.product_id, v.id, v.handle, v.ptitle, v.title,
              v.inventory_mode, coalesce(v.fulfillment_provider_id,(select id from prov)), 1, 3000, 3000
       from cs, v returning id, checkout_session_id
     )
insert into checkout_line_components (checkout_line_id, component_variant_id, component_title_snapshot,
       fulfillment_mode_snapshot, provider_id_snapshot, location_id_snapshot, quantity_per_parent, total_quantity)
select cl.id, v.id, v.title, v.inventory_mode, coalesce(v.fulfillment_provider_id,(select id from prov)),
       (select id from loc), 1, 1
from cl, v
returning (select checkout_session_id from cl);
SQL
}

C1=$(mk_checkout); C2=$(mk_checkout)
echo "  two checkouts prepared for the same unit"

# Race them.
r1=/tmp/race1.out; r2=/tmp/race2.out
rm -f "$r1" "$r2" "$r1.rc" "$r2.rc"
# `set -e` must not abort the subshell before it records the exit code — the
# losing reservation is EXPECTED to fail.
( set +e; Q -c "select reserve_checkout_inventory('$C1');" > "$r1" 2>&1; echo $? > "$r1.rc" ) &
( set +e; Q -c "select reserve_checkout_inventory('$C2');" > "$r2" 2>&1; echo $? > "$r2.rc" ) &
wait

ok=0
for f in "$r1" "$r2"; do
  rc=$(cat "$f.rc" 2>/dev/null || echo "missing")
  if [ "$rc" = "0" ] && grep -q "reserved" "$f"; then ok=$((ok+1)); fi
done

FINAL=$(Q -c "select available from inventory_levels where variant_id='$TEE';")
echo "  successes=$ok  final_available=$FINAL"
grep -h "insufficient inventory" $r1 $r2 | head -1 | sed 's/^/  loser: /' || true

if [ "$ok" -ne 1 ]; then
  echo "  FAIL case 1: expected exactly 1 success, got $ok"; cat $r1 $r2; exit 1
fi
if [ "$FINAL" != "0" ]; then
  echo "  FAIL case 1: available should be 0, got $FINAL"; exit 1
fi
echo "  PASS case 1  exactly one reservation wins the last unit"

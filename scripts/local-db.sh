#!/usr/bin/env bash
# Local PostgreSQL harness for validating the BAD ERA schema without Docker or
# a hosted Supabase project.
#
#   scripts/local-db.sh start    initdb + start on port 5433
#   scripts/local-db.sh reset    drop schemas, replay 0001..NNNN, load seed
#   scripts/local-db.sh verify   assert the security invariants
#   scripts/local-db.sh types    regenerate src/lib/db/generated.types.ts
#   scripts/local-db.sh acceptance  run the v0.2 acceptance matrix
#   scripts/local-db.sh stop
#
# The shim in scripts/supabase-shim.sql recreates the platform objects Supabase
# provides (auth schema, anon/authenticated/service_role roles). It is for local
# validation ONLY and must never be applied to a hosted Supabase project.
set -euo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDATA="${PGDATA:-/var/lib/badera-pg}"
PGPORT="${PGPORT:-5433}"
PGHOST="${PGHOST:-/tmp}"
DBURL="postgresql://postgres@localhost:${PGPORT}/postgres"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

psql_run() { psql -h "$PGHOST" -p "$PGPORT" -U postgres -v ON_ERROR_STOP=1 "$@"; }

case "${1:-}" in
  start)
    if [ ! -d "$PGDATA/base" ]; then
      mkdir -p "$PGDATA"; chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"
      su postgres -c "PATH=$PGBIN:\$PATH initdb -D $PGDATA -A trust -U postgres" >/dev/null
    fi
    su postgres -c "PATH=$PGBIN:\$PATH pg_ctl -D $PGDATA -l $PGDATA/server.log -o '-p $PGPORT -k $PGHOST' start"
    sleep 2
    "$0" reset
    ;;

  stop)
    su postgres -c "PATH=$PGBIN:\$PATH pg_ctl -D $PGDATA stop" || true
    ;;

  reset)
    psql_run -q -c "drop schema if exists public cascade; create schema public;" >/dev/null
    psql_run -q -c "drop schema if exists private cascade;" >/dev/null
    psql_run -q -c "drop schema if exists auth cascade;" >/dev/null
    # The storage schema is shim-provided too. Dropping it keeps a reset a true
    # from-scratch replay — otherwise migration 0012's object policies survive
    # and collide on the next run.
    psql_run -q -c "drop schema if exists storage cascade;" >/dev/null
    # The shim is idempotent; roles survive a schema drop.
    psql_run -q -f "$ROOT/scripts/supabase-shim.sql" >/dev/null
    for f in "$ROOT"/supabase/migrations/[0-9]*.sql; do
      printf '  %-52s' "$(basename "$f")"
      if ! psql_run -q -f "$f" >/dev/null; then
        echo "FAILED"
        exit 1
      fi
      echo "OK"
    done
    printf '  %-52s' "seed.sql"
    if ! psql_run -q -f "$ROOT/supabase/seed.sql" >/dev/null; then
      echo "FAILED"
      exit 1
    fi
    echo "OK"
    ;;

  verify)
    psql_run -X -q -f "$ROOT/scripts/verify-security.sql"
    ;;

  types)
    node "$ROOT/scripts/gen-types.mjs" "$DBURL"
    ;;

  smoke)
    psql_run -X -q -f "$ROOT/tests/integration/sql/smoke_bundle_conversion.sql"
    ;;

  acceptance)
    # Deterministic cases run from a freshly seeded database.
    "$0" reset >/dev/null
    psql_run -X -q -f "$ROOT/tests/integration/sql/acceptance.sql"
    # Case 1 needs two concurrent connections, so it runs separately.
    "$0" reset >/dev/null
    "$ROOT/tests/integration/sql/concurrency_last_unit.sh"
    ;;

  *)
    sed -n '2,12p' "$0"; exit 1
    ;;
esac

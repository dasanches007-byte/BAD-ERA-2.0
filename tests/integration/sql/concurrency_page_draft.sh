#!/usr/bin/env bash
# Acceptance case 18: two editors open a never-edited page at the same moment.
# Both must get the SAME draft, exactly one draft revision may be created, and
# the live revision must be untouched (migration 0016).
#
# The owner's first session forked a rival draft of `home` (a misread of the
# draft pointer made every load think none existed) and died on
# page_drafts_pkey. This proves the database refuses to fork a second draft
# even when two callers genuinely arrive together.
#
# Needs two real connections, so this runs outside acceptance.sql.
set -euo pipefail

PGPORT="${PGPORT:-5433}"
PGHOST="${PGHOST:-/tmp}"
Q() { psql -h "$PGHOST" -p "$PGPORT" -U postgres -X -A -t -q -v ON_ERROR_STOP=1 "$@"; }

# A published page with two sections and no draft yet.
PAGE=$(Q <<'SQL'
with p as (
  insert into public.pages (page_key, page_kind, title, template_key)
  values ('race-' || substr(md5(random()::text),1,8), 'page', 'Draft race', 'editorial')
  returning id
), r as (
  insert into public.page_revisions (page_id, revision_number, state)
  select id, 1, 'draft' from p
  returning id, page_id
), s as (
  insert into public.page_sections (revision_id, section_key, section_type, position, payload)
  select r.id, k, 'hero.editorial', n, jsonb_build_object('heading', k)
  from r, (values ('a', 0), ('b', 1)) as v(k, n)
  returning revision_id
)
select page_id || ' ' || id from r, (select count(*) from s) c;
SQL
)
PAGE_ID=${PAGE%% *}
LIVE=${PAGE##* }
Q -c "update public.page_revisions set state='published', published_at=now() where id='$LIVE';
      update public.pages set published_revision_id='$LIVE' where id='$PAGE_ID';" > /dev/null
echo "  never-edited page staged: live revision has 2 sections, no draft"

r1=$(mktemp); r2=$(mktemp)
# Session A holds its transaction open after creating the draft, so session B
# is guaranteed to arrive while A's draft is still uncommitted. Without the
# row lock B would see no draft and fork a rival; with it, B waits.
( set +e; Q -c "begin; select public.ensure_page_draft('$PAGE_ID'); select pg_sleep(1.5); commit;" > "$r1" 2>&1; echo $? > "$r1.rc" ) &
sleep 0.4
( set +e; Q -c "select public.ensure_page_draft('$PAGE_ID');" > "$r2" 2>&1; echo $? > "$r2.rc" ) &
wait

rc1=$(cat "$r1.rc"); rc2=$(cat "$r2.rc")
d1=$(grep -Eo '[0-9a-f-]{36}' "$r1" | head -1 || true)
d2=$(grep -Eo '[0-9a-f-]{36}' "$r2" | head -1 || true)
DRAFTS=$(Q -c "select count(*) from public.page_revisions where page_id='$PAGE_ID' and state='draft';")
POINTER=$(Q -c "select revision_id from public.page_drafts where page_id='$PAGE_ID';")
COPIED=$(Q -c "select count(*) from public.page_sections where revision_id='$POINTER';")
STILL_LIVE=$(Q -c "select published_revision_id from public.pages where id='$PAGE_ID';")
echo "  callers: rc=$rc1/$rc2  same_draft=$([ "$d1" = "$d2" ] && echo yes || echo no)  draft_revisions=$DRAFTS  sections_copied=$COPIED"

fail() { echo "  FAIL case 18: $1"; cat "$r1" "$r2"; exit 1; }
[ "$rc1" = "0" ] && [ "$rc2" = "0" ] || fail "a caller errored"
[ -n "$d1" ] && [ "$d1" = "$d2" ] || fail "callers got different drafts ($d1 vs $d2)"
[ "$DRAFTS" = "1" ] || fail "expected 1 draft revision, found $DRAFTS"
[ "$POINTER" = "$d1" ] || fail "page_drafts does not point at the returned draft"
[ "$COPIED" = "2" ] || fail "expected the 2 live sections copied, found $COPIED"
[ "$STILL_LIVE" = "$LIVE" ] || fail "the live revision changed"

# Calling it again is a read, not another fork.
AGAIN=$(Q -c "select public.ensure_page_draft('$PAGE_ID');")
[ "$AGAIN" = "$d1" ] || fail "a repeat call returned a different draft"
[ "$(Q -c "select count(*) from public.page_revisions where page_id='$PAGE_ID';")" = "2" ] \
  || fail "a repeat call created a revision"

# A browser must not be able to call it.
for role in anon authenticated; do
  if Q -c "set role $role; select public.ensure_page_draft('$PAGE_ID');" > /dev/null 2>&1; then
    fail "$role can execute ensure_page_draft"
  fi
done

rm -f "$r1" "$r2" "$r1.rc" "$r2.rc"
echo "  PASS case 18  concurrent editors share one draft; live untouched"

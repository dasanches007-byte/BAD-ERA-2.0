# BAD ERA — backup and restore

Master Spec §17: *"Database migrations are versioned and repeatable. Backups /
restore procedure documented before launch."*

This document is the procedure. It is written to be followed under pressure, by
someone who did not write the system.

---

## What has to survive

| Asset | Where it lives | Backed up by |
|---|---|---|
| All 62 tables (orders, payments, inventory, content) | Supabase PostgreSQL | Supabase automated backups + `pg_dump` |
| Storage objects (`media-public`, `media-private`) | Supabase Storage | **Not** covered by database backups — see below |
| Schema definition | `supabase/migrations/0001…0014` in git | git |
| Stripe payment truth | Stripe | Stripe (system of record; never restored from here) |
| Environment secrets | Vercel project settings | **Not** backed up anywhere automatically |

Two of those rows are the ones that catch people out. A Supabase database
backup does **not** include Storage objects, and it does **not** include your
environment variables. Both need their own copy.

---

## Backup

### 1. Database — automated

Supabase takes daily automated backups on paid plans, with point-in-time
recovery available as an add-on. Confirm which one is active before launch:

> Supabase dashboard → Project → Database → Backups

Daily backups alone mean a worst case of ~24 hours of lost orders. For a store
taking real payments, enable **Point-in-Time Recovery**. Stripe will still hold
the payment record for an order the database lost, and reconciling that by hand
is the scenario PITR exists to prevent.

### 2. Database — manual snapshot before anything risky

Take one before every migration, every bulk edit, and every restore attempt:

```sh
# Connection string: Supabase dashboard -> Project Settings -> Database
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="badera-$(date +%Y%m%d-%H%M%S).dump"
```

Store it somewhere that is not the same account as the database.

### 3. Storage objects

Storage is **not** in the database backup. Media uploaded through Studio lives
only in the bucket until it is copied out:

```sh
# Requires the Supabase CLI, authenticated against the project.
supabase storage cp -r ss://media-public ./backup/media-public --experimental
supabase storage cp -r ss://media-private ./backup/media-private --experimental
```

Until the owner adds final production photography this is nearly empty, and it
is easy to decide it does not matter yet. It stops being nearly empty the day
the photography lands, which is exactly the day it becomes irreplaceable.

### 4. Secrets

Record these in a password manager, not in the repository:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `PREVIEW_SECRET`

Losing the database is recoverable. Losing the Stripe webhook secret while the
database is down means payments cannot be reconciled at all.

---

## Restore

### Path A — restore a whole project (disaster)

1. **Stop the bleeding.** In Vercel, put the site in maintenance or roll back to
   a build that does not write. Every minute the app runs against a broken
   database is a minute of writes to reconcile later.
2. **Disable the Stripe webhook endpoint** in the Stripe dashboard. Stripe
   retries failed deliveries for up to 3 days, so events are *not* lost — they
   queue and replay once the endpoint is healthy. Leaving it live during a
   restore means events landing in a half-restored database.
3. Restore the database:
   - PITR: Supabase dashboard → Database → Backups → *Restore to point in time*.
     Choose a timestamp **before** the incident.
   - From a dump: `pg_restore --clean --if-exists --no-owner -d "$SUPABASE_DB_URL" badera-<ts>.dump`
4. **Verify the schema** before letting traffic in:
   ```sh
   npm run db:verify        # 62 tables / 62 RLS / 62 owner policies / 0 anon grants
   ```
5. Restore Storage objects if the bucket was affected (`supabase storage cp` in
   the other direction).
6. **Re-enable the Stripe webhook.** Queued events replay. `claim_stripe_event`
   makes every one idempotent, so a replayed `checkout.session.completed`
   cannot create a second order — this is the property that makes the whole
   recovery safe.
7. Reconcile: compare Stripe payments in the gap against `orders`. Anything in
   Stripe with no order is a webhook that never landed; re-send it from the
   Stripe dashboard rather than creating the order by hand.
8. Bring the site back up.

### Path B — rebuild the schema from migrations

For a brand-new environment, or when the schema is corrupt but the data is not
worth keeping (staging, preview):

```sh
# Against a NEW Supabase project — never against production with data in it.
for f in supabase/migrations/[0-9]*.sql; do psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

Migrations must be applied strictly in order `0001 → 0014`. This chain is
verified from scratch on every `npm run db:reset`, so "it replays cleanly" is a
tested claim rather than an assumption.

> `supabase/seed.sql` is development data. Never load it into production.

### Path C — undo a bad content publish

Not a database restore. Studio → Publishing → roll the publish set back. History
is append-only, so the rollback is itself a revision and nothing is lost.

---

## Verifying a backup is real

An untested backup is a hope, not a backup. Quarterly, and before launch:

1. Create a scratch Supabase project.
2. Restore the most recent dump into it.
3. Run `npm run db:verify` — it must report all invariants passing.
4. Run `npm run db:acceptance` — the commerce guarantees (oversell protection,
   idempotent payment conversion, atomic bundle decrement) must all pass
   against the restored data.
5. Delete the scratch project.

If step 3 or 4 fails, the backup is not usable and the cause needs fixing before
it is relied on.

---

## Owner checklist before launch

- [ ] Point-in-Time Recovery enabled on the Supabase project
- [ ] One manual `pg_dump` taken and stored off-account
- [ ] Storage buckets copied once, with a recurring reminder after photography lands
- [ ] All secrets recorded in a password manager
- [ ] One restore rehearsal completed against a scratch project (steps above)

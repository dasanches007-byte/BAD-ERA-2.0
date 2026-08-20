# BAD ERA v0.2 Security Contract

- RLS is enabled on all 62 public tables.
- `anon` gets no public-table privileges. Public storefront rendering goes through trusted Next.js server code.
- `authenticated` receives database object privileges but RLS denies everything except explicit customer-self policies and the Studio-owner all policy.
- Studio authorization comes from `studio_users`, not user-editable JWT user_metadata.
- `private.is_studio_owner()` and `private.current_customer_id()` are SECURITY DEFINER helpers with `search_path = ''` and schema-qualified relations.
- Supabase service-role credentials are server-only and are used for verified Stripe/provider webhooks and trusted commerce RPCs.
- Supplier credentials are references; raw secrets stay outside database/browser payloads.
- Supplier cost and internal operational tables have no customer policies.
- Webhook event IDs and paid conversion are idempotent at database level.

# Getting into BAD ERA STUDIO

How to run the site, sign in, and start editing. Written for the owner, not for
a developer.

> **The site is not deployed anywhere yet.** There is no URL to visit. You need
> to either run it on your own machine (5 minutes) or deploy it (15 minutes).
> Both are below.

---

## Your login

| | |
|---|---|
| Email | `dasanches007@gmail.com` |
| Password | The one set when the account was created in Supabase |
| Studio URL | `/studio` (redirects you to `/sign-in` first) |

You have **never signed in** — the account shows no sign-in history. If you
don't remember the password, reset it:

> Supabase dashboard → **Authentication** → **Users** → click your email →
> **Reset password** (or send a magic link)

Do this through the dashboard, not by editing the database. Supabase's auth
service owns password hashing, and hand-written auth rows create accounts that
fail to sign in in confusing ways.

---

## Option A — run it on your machine

**You need:** Node 20.9 or newer (`node -v` to check), and git.

### 1. Get the code

```sh
git clone https://github.com/dasanches007-byte/BAD-ERA-2.0.git
cd BAD-ERA-2.0
git checkout claude/festive-cray-354clx
npm install
```

### 2. Create your `.env.local`

```sh
cp .env.example .env.local
```

Open `.env.local` and fill in **four values**. Everything else can stay empty
for now.

Get them from: Supabase dashboard → **Project Settings** → **API**

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" — `https://snkvgpfpnphvbkiafptd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The **anon** / **publishable** key. Safe in a browser |
| `SUPABASE_SERVICE_ROLE_KEY` | The **service_role** key. **Never** put this anywhere public |
| `NEXT_PUBLIC_SITE_URL` | Leave as `http://localhost:3000` |

**You do not need Stripe or Resend keys to use Studio.** They're only checked
when something actually needs them — a checkout, or an email. You can edit
content, upload media and manage products today without either.

### 3. Start it

```sh
npm run dev
```

Open **http://localhost:3000/studio** — it will send you to the sign-in page.

---

## Option B — deploy it to Vercel

So you can reach Studio from your phone, and so the site has a real address.

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import
   `dasanches007-byte/BAD-ERA-2.0`
2. Set **Production Branch** to `claude/festive-cray-354clx`
3. Add the same four environment variables from step 2 above, except set
   `NEXT_PUBLIC_SITE_URL` to your real Vercel URL (e.g.
   `https://bad-era.vercel.app`)
4. Deploy

Framework, build command and output are all detected automatically — Next.js
needs no extra configuration here.

> **Set `NEXT_PUBLIC_SITE_URL` correctly.** Stripe redirect URLs and the sitemap
> are both derived from it. If it's wrong, customers get bounced to the wrong
> place after paying.

Once a custom domain is attached, update `NEXT_PUBLIC_SITE_URL` again and
redeploy.

---

## First five minutes inside Studio

Do these two security steps before anything else.

### 1. Turn on two-factor authentication

**Studio → Settings → Security → Set up two-factor**

Scan the QR code with any authenticator app (Google Authenticator, 1Password,
Authy), then type the six-digit code to confirm.

Until you do this the second-factor gate is inert — that's deliberate, because
enforcing it before you have an authenticator would lock you out of the only
screen that can enrol one. From the moment you finish, every sign-in asks for a
code.

### 2. Rotate the service-role key

That key was pasted into a chat transcript during the build, and it bypasses
every database security rule. Replace it:

> Supabase dashboard → **Project Settings** → **API** → service_role →
> **Generate new key**

Then update `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` **and** in Vercel, and
redeploy.

---

## What's already in your store

Checked against the live database:

| | |
|---|---|
| Home page | Published, 6 sections — editable now |
| About / Privacy / Terms / Shipping / Returns policy / Support | Registered and editable, **none published yet** — they show the "not published" placeholder until you write them |
| Products | **0** |
| Variants | **0** |
| Media assets | **0** |
| Orders | 0 |
| Inventory locations | 1 |
| Fulfillment providers | 1 (BAD ERA STOCK) |
| Flat shipping rate | **Not set** |

So the storefront currently renders the approved structure with empty
photography slots and no products. That is the expected starting state, not a
fault.

---

## Where things live

| I want to… | Go to |
|---|---|
| Change homepage words and images | **Site Editor** → home |
| Write the privacy / terms / shipping / returns / about pages | **Site Editor** → pick the page → add a **Policy text** section → **Publishing** → publish |
| Upload photography | **Media** → upload, then assign it to a slot in the Site Editor |
| Add the Archive 01 products | **Products** → new product → add variants |
| Enter how many you physically have | **Inventory** |
| Push changes live | **Publishing** → review → publish |
| Undo a publish | **Publishing** → Publish history → Roll back |

### How editing works

- Your edits save automatically into a **draft**. The live site does not change.
- The middle pane shows the draft exactly as it will look — same renderer as the
  real page.
- Nothing reaches the public site until you press **Publish**.
- Every publish is recorded and can be rolled back. Nothing is ever deleted.

### What you can't break

The editor deliberately has no font, colour, size, spacing or HTML controls. You
change words, images and which sections show. The design stays locked, so the
site can't drift away from the brand no matter what you type.

---

## Before you can take money

Checkout will refuse to run until these exist. That's intentional — the
alternative is quoting a shipping price nobody decided on.

- [ ] **Flat shipping rate** — currently unset, and checkout fails loudly
      without it
- [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, with a webhook endpoint
      pointed at `https://your-domain/api/webhooks/stripe`
- [ ] `RESEND_API_KEY` + verified sending domain, for order emails
- [ ] Real product records and physical inventory counts

Then run the 8-step test purchase in `docs/LAUNCH_READINESS.md` before going
live. Nothing in this build has ever taken a payment.

---

## If something goes wrong

**"Studio authorization required"** — you're signed in, but the account isn't
marked as an owner. Run `scripts/grant-studio-owner.sql` in the Supabase SQL
editor with your email.

**Sign-in says the email and password don't match** — reset the password from
the Supabase dashboard. The message is deliberately vague so it can't be used to
discover which emails have accounts.

**"Too many sign-in attempts"** — the rate limit is 5 attempts per 5 minutes.
Wait it out.

**A page says "Could not load…"** — that's a real read failure, not an empty
result. Check that your Supabase keys are right and the project isn't paused.
Studio deliberately never shows "0" when the truth is "the query failed".

**Checkout fails with "store not configured"** — the flat shipping rate isn't
set. See above.

**Build or dev server won't start** — check `node -v` is 20.9+, then delete
`node_modules` and `.next` and run `npm install` again.

---

## Useful commands

```sh
npm run dev        # local dev server
npm run verify     # lint, typecheck, tests, build — run before committing
npm run build      # production build
```

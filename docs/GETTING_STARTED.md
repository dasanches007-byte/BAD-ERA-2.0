# Getting into BAD ERA STUDIO

How to run the site, sign in, and start editing. Written for the owner, not for
a developer.

> **The site is not deployed anywhere yet.** There is no URL to visit.

There are two ways to get one, and for most people the first is the right
choice:

| | Terminal needed? | You get |
|---|---|---|
| **A. Deploy to Vercel** | **No** — all point-and-click | A real URL, works on your phone |
| **B. Run on your computer** | Yes | A local-only address, changes appear instantly |

**Start with A.** You only need B if you are editing the code itself.

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

## Option A — deploy to Vercel (no terminal)

Everything here happens in a web browser. Nothing is installed on your computer.

### 1. Collect your four keys first

Open the Supabase dashboard → **Project Settings** → **API**, and keep the tab
open. You will copy four values:

| Value | Where it is on that page |
|---|---|
| Project URL | "Project URL" — `https://snkvgpfpnphvbkiafptd.supabase.co` |
| anon key | The **anon** / **publishable** key. Safe to expose |
| service_role key | The **service_role** key. **Secret** — never post it anywhere |
| Site URL | You will not have this until step 3. Use `http://localhost:3000` for now |

### 2. Import the project

1. Go to [vercel.com](https://vercel.com) and sign in **with GitHub**
2. **Add New** → **Project**
3. Find `BAD-ERA-2.0` in the list → **Import**
4. Before deploying, expand **Environment Variables** and add these four:

```
NEXT_PUBLIC_SUPABASE_URL        https://snkvgpfpnphvbkiafptd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   (the anon key)
SUPABASE_SERVICE_ROLE_KEY       (the service_role key)
NEXT_PUBLIC_SITE_URL            http://localhost:3000
```

5. Click **Deploy** and wait a minute or two

Vercel detects Next.js on its own — you do not need to set a build command,
output directory or framework.

### 3. Point it at the right branch, and fix the site URL

1. **Settings** → **Git** → set **Production Branch** to
   `claude/festive-cray-354clx` if it is not already
2. Copy your new Vercel URL (something like `https://bad-era-2-0.vercel.app`)
3. **Settings** → **Environment Variables** → change `NEXT_PUBLIC_SITE_URL` to
   that URL
4. **Deployments** → the newest one → **⋯** → **Redeploy**

> **That last step matters.** Stripe redirect URLs and the sitemap are both
> built from `NEXT_PUBLIC_SITE_URL`. If it still says localhost, customers get
> sent to a dead address after paying.

### 4. Sign in

Open your Vercel URL and add `/studio` to the end. It will send you to the
sign-in page.

Do the same again later if you attach a custom domain: update
`NEXT_PUBLIC_SITE_URL`, then redeploy.

---

## Option B — run it on your own computer

Only worth doing if you want to change the code. For writing content and
uploading photos, Option A is easier and better.

These are **terminal** commands — they do not run on GitHub, and they are not
typed into a browser. Open:

- **Mac** — the **Terminal** app (Cmd+Space, type "Terminal")
- **Windows** — **PowerShell** (Start menu, type "PowerShell")

**You need first:** [Node.js](https://nodejs.org) 20.9 or newer (check with
`node -v`) and [git](https://git-scm.com).

A line starting with `#` is a note to you, not a command to type.

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

Only relevant if you set up Option B. Run them in a terminal, inside the
`BAD-ERA-2.0` folder.

```sh
npm run dev        # start the local site at http://localhost:3000
npm run verify     # lint, typecheck, tests, build — run before committing code
npm run build      # production build
```

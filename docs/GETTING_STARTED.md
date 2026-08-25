# Getting into BAD ERA STUDIO

How to run the site, sign in, and start editing. Written for the owner, not for
a developer.

> **The site is not deployed anywhere yet.** There is no URL to visit.

There are two ways to get one, and for most people the first is the right
choice:

| | Needs installing? | You get |
|---|---|---|
| **A. Deploy to Vercel** | No — all point-and-click | A permanent URL, works on your phone |
| **B. GitHub Codespaces** | No — runs in a browser tab | A temporary URL + a real terminal |
| **C. Run on your computer** | Yes | A local address, changes appear instantly |

**A** if you want the site online. **B** if you want to run or change the code
without installing anything — it works from a phone or a Chromebook. **C** only
if you would rather work on your own machine.

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

## Option B — GitHub Codespaces (a computer in a browser tab)

Codespaces gives you a real Linux machine with a terminal, running in a browser.
Nothing is installed on your device. This works from a Chromebook or an iPhone.

Free allowance: **120 core-hours a month** — that is 60 real hours on the
default 2-core machine — plus 15 GB of storage. Stop the Codespace when you are
done and it stops consuming hours.

### Step 1 — store your keys, once

The Codespace reads its configuration from GitHub, so there is no hidden file to
edit on a phone keyboard.

1. Go to **github.com/settings/codespaces**
2. Under **Codespaces secrets**, click **New secret** and add each of these,
   with the value from Supabase → **Project Settings** → **API**:

| Secret name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | The "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | The service_role key — secret |

3. For each one, give it access to the **BAD-ERA-2.0** repository

GitHub stores these encrypted. They are never committed to the repo.

### Step 2 — open the Codespace

1. Go to the repository on GitHub
2. Switch the branch selector to **`claude/festive-cray-354clx`**
3. Click the green **Code** button → **Codespaces** tab → **Create codespace on
   claude/festive-cray-354clx**

The first build takes about three minutes — it installs Node 22 and the project
dependencies for you. After that, opening it again takes seconds.

### Step 3 — it starts itself

When the Codespace opens, it runs the site automatically and prints the address.
A browser tab opens once it is ready; if it does not, open the **PORTS** tab,
find port 3000, and tap the globe icon.

Add `/studio` to that address to reach the editor.

> If you see **"BAD ERA is not configured yet"**, a secret from Step 1 is
> missing. Add it, then Command Palette (Ctrl+Shift+P) →
> **Codespaces: Rebuild Container**.

### Stopping and coming back

Close the tab and the Codespace sleeps on its own after 30 minutes. To stop it
immediately: github.com/codespaces → **⋯** next to it → **Stop codespace**.

Reopening it from github.com/codespaces starts the site again automatically.

> **On an iPhone this works but is cramped** — VS Code's web interface is not
> built for touch. Fine for a quick change; use Option A if you mainly want to
> write content and upload photos, since Studio itself is properly mobile-shaped.

---

## Option C — run it on your own computer

Only worth doing if you want the project on your own machine. Options A and
B need nothing installed.

These are **terminal** commands. They do not run on GitHub and they are not
typed into a browser address bar. A line starting with `#` is a note to you,
not a command.

Jump to your machine:

- [Chromebook](#chromebook) — needs one extra setup step first
- [Mac or Windows](#mac-or-windows)

---

### Chromebook

ChromeOS has no terminal until you switch one on. This is a built-in ChromeOS
feature — you are not installing anything unofficial.

> **Check your specs first.** Settings → About ChromeOS. With **4 GB of RAM**
> the dev server will run but feel slow, and you should close other Chrome tabs
> while it is running. With 8 GB it is comfortable. You also want **at least
> 10 GB of free storage**.

#### Step 1 — turn on Linux

1. Open **Settings** (the gear icon)
2. In the left sidebar, click **Advanced** → **Developers**
   *(on some versions it is just **Developers**, no Advanced)*
3. Find **Linux development environment** → click **Turn on**
4. Username: anything lowercase, e.g. `badera`
5. Disk size: drag to **at least 15 GB** if it offers a slider
6. Click **Install** and wait — it downloads a few hundred MB

When it finishes, a black **Terminal** window opens by itself. Right-click its
icon in the shelf → **Pin** so you can find it again.

> **No "Linux development environment" option?** Your Chromebook is too old or
> is managed by a school or workplace that has disabled it. In that case use
> Option A — it works from any browser.

#### Step 2 — install the tools

In that Terminal window, type each block and press Enter. It will ask for your
password on the first one — this is the Linux password you just created, and
**nothing appears on screen as you type it**. That is normal.

```sh
sudo apt update && sudo apt install -y git curl
```

Now install Node.js. Debian's built-in version is too old for this project, so
use `nvm`, which installs Node just for your user and needs no admin rights:

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Close the Terminal window and open it again — this is required, `nvm` is not
available until you do. Then:

```sh
nvm install 22
node -v
```

That last command must print `v22.something`. If it does, you have what you
need.

Now continue to [the shared steps](#the-shared-steps) below.

---

### Mac or Windows

Open your terminal:

- **Mac** — press Cmd+Space, type `Terminal`, press Enter
- **Windows** — Start menu, type `PowerShell`, press Enter

Install [Node.js](https://nodejs.org) (choose the **LTS** version) and
[git](https://git-scm.com) if you do not have them. Check with:

```sh
node -v
```

It must print v20.9 or higher.

---

### The shared steps

Same on every machine from here.

#### 1. Get the code

```sh
git clone https://github.com/dasanches007-byte/BAD-ERA-2.0.git
cd BAD-ERA-2.0
git checkout claude/festive-cray-354clx
npm install
```

`npm install` takes a few minutes and prints a lot of text. Warnings are fine.
Only stop if it says **error**.

#### 2. Add your keys

```sh
cp .env.example .env.local
nano .env.local
```

`nano` is a text editor inside the terminal. Use the arrow keys — the mouse
will not work.

Fill in **four values**, from Supabase dashboard →
**Project Settings** → **API**:

| Line to edit | What to paste |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL=` | `https://snkvgpfpnphvbkiafptd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY=` | The **anon** / **publishable** key |
| `SUPABASE_SERVICE_ROLE_KEY=` | The **service_role** key — secret, never share it |
| `NEXT_PUBLIC_SITE_URL=` | Leave as `http://localhost:3000` |

Keep the quotes: `NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbG..."`

To save and quit nano:

1. **Ctrl+O** then **Enter** (writes the file)
2. **Ctrl+X** (quits)

> **Pasting into the Chromebook terminal:** use **Ctrl+Shift+V**, not Ctrl+V.

You do **not** need Stripe or Resend keys. They are only checked when something
actually needs them, so Studio works without either.

#### 3. Start it

```sh
npm run dev
```

Wait for `✓ Ready`. Leave this window open — closing it stops the site.

Open a new Chrome tab and go to:

```
http://localhost:3000/studio
```

It will send you to the sign-in page.

> **Chromebook note:** `localhost:3000` in Chrome reaches the Linux container
> directly. If it does not load, try `http://penguin.linux.test:3000` instead.

To stop the site later, click the terminal window and press **Ctrl+C**.

#### Coming back another day

```sh
cd BAD-ERA-2.0
npm run dev
```

That is all — the setup steps are one-time.

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

**Chromebook: `nvm: command not found`** — you skipped closing and reopening
the Terminal after installing nvm. Close the window, open it again, retry.

**Chromebook: `localhost:3000` won't load** — make sure `npm run dev` is still
running and shows `✓ Ready`. If it is, try `http://penguin.linux.test:3000`.

**Chromebook: everything is very slow** — `next dev` compiles pages on demand
and wants memory. Close other Chrome tabs. On a 4 GB machine the first load of
each page can take 10–20 seconds; it is faster afterwards.

**Chromebook: out of disk space** — Settings → Advanced → Developers → Linux →
**Disk size** → increase it. `node_modules` alone is several hundred MB.

**`npm install` fails with permission errors** — you used `sudo npm`. Don't.
Delete `node_modules` and run `npm install` without sudo.

---

## Useful commands

Only relevant if you set up Option B. Run them in a terminal, inside the
`BAD-ERA-2.0` folder.

```sh
npm run dev        # start the local site at http://localhost:3000
npm run verify     # lint, typecheck, tests, build — run before committing code
npm run build      # production build
```

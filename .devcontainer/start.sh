#!/usr/bin/env bash
# Runs EVERY time the Codespace is opened (postAttachCommand).
#
# Configuration comes from Codespaces secrets entered on the "Create codespace"
# page, not from a .env.local file: editing a hidden dotfile on a phone keyboard
# is miserable, and this repository is public, so keys must never be committed.

set -uo pipefail

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'; OFF=$'\033[0m'

# Resolve this Codespace's name and forwarding domain the same way
# next.config.ts does: environment first, then the file GitHub writes into
# every Codespace, then (domain only) GitHub's standard forwarding domain.
# The results are exported so `next dev` inherits them explicitly instead of
# depending on whatever environment this script happened to be started with.
CS_FILE=/workspaces/.codespaces/shared/environment-variables.json
cs_var() {
  local value="${!1:-}"
  if [ -z "$value" ] && [ -r "$CS_FILE" ]; then
    value=$(node -e "const v=require('$CS_FILE')['$1'];process.stdout.write(typeof v==='string'?v:'')" 2>/dev/null)
  fi
  printf '%s' "$value"
}
CS_NAME="$(cs_var CODESPACE_NAME)"
CS_DOMAIN="$(cs_var GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN)"
IN_CODESPACE=""
if [ "${CODESPACES:-}" = "true" ] || [ -e "$CS_FILE" ] || [ -n "$CS_NAME" ]; then IN_CODESPACE=1; fi

# next.config.ts recognises a Codespace by CODESPACES=true. Exporting it keeps
# the two in agreement even when only the variables file gave us away.
if [ -n "$IN_CODESPACE" ]; then export CODESPACES=true; fi

# Codespaces reaches the dev server through a forwarded address, not localhost.
# Sign-in redirects and Stripe return URLs are built from NEXT_PUBLIC_SITE_URL,
# so it must be that forwarded address or they land on a dead page.
if [ -n "$CS_NAME" ]; then
  CS_DOMAIN="${CS_DOMAIN:-app.github.dev}"
  export CODESPACE_NAME="$CS_NAME"
  export GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN="$CS_DOMAIN"
  export NEXT_PUBLIC_SITE_URL="https://${CS_NAME}-3000.${CS_DOMAIN}"
fi
SITE="${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}"

# One line that says which origins sign-in will accept, so a mismatch is
# visible on screen instead of surfacing later as an opaque E80. The proxy
# rewrites the browser's Origin to localhost:3000, which is the one that
# matters; the Codespace's own address is accepted too.
if [ -n "$CS_NAME" ]; then
  SIGNIN_LINE="${DIM}Sign-in accepted from  localhost:3000 (the Codespaces proxy) and ${CS_NAME}-3000.${CS_DOMAIN}${OFF}"
elif [ -n "$IN_CODESPACE" ]; then
  SIGNIN_LINE="${DIM}Sign-in accepted from  localhost:3000 (the Codespaces proxy)${OFF}
${DIM}Couldn't find this Codespace's name, so links in emails may point at localhost.${OFF}"
else
  SIGNIN_LINE=""
fi

port_in_use() { (exec 3<>/dev/tcp/127.0.0.1/3000) 2>/dev/null; }

# Keep this Codespace on the latest version on GitHub.
#
# Without this, a Codespace keeps the code it was created with forever: new
# Studio features land on GitHub and never reach the owner's editor. So every
# start fetches, and fast-forwards when it safely can. It never discards
# anything — the one exception is the block `next dev` itself writes into
# CLAUDE.md, which is restored only when it is the ONLY change in that file.
# Anything else uncommitted, or a history that has diverged, and the update
# is skipped with a note; the site still starts on the code that is here.
UPDATED=""
GENERATED_BLOCK='<!-- BEGIN:nextjs-agent-rules -->'
only_generated_block() {
  node -e '
    const fs = require("fs"), cp = require("child_process");
    const file = process.argv[1];
    const strip = (t) => t.replace(/\n*<!-- BEGIN:nextjs-agent-rules -->[\s\S]*?<!-- END:nextjs-agent-rules -->\n*/g, "\n").trimEnd();
    const head = cp.execFileSync("git", ["show", "HEAD:" + file], { encoding: "utf8" });
    process.exit(strip(fs.readFileSync(file, "utf8")) === strip(head) ? 0 : 1);
  ' "$1" 2>/dev/null
}
update_code() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 0
  local branch upstream before after
  branch=$(git symbolic-ref --quiet --short HEAD) || return 0
  upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null) || upstream="origin/$branch"

  echo "${DIM}Checking GitHub for a newer version…${OFF}"
  if ! GIT_TERMINAL_PROMPT=0 timeout 60 git fetch --quiet origin "$branch" 2>/dev/null; then
    echo "${DIM}Couldn't reach GitHub, so this starts the version already here.${OFF}"
    return 0
  fi

  before=$(git rev-parse HEAD)
  [ "$before" = "$(git rev-parse "$upstream" 2>/dev/null)" ] && return 0

  if ! git diff --quiet -- CLAUDE.md 2>/dev/null && grep -q "$GENERATED_BLOCK" CLAUDE.md 2>/dev/null \
    && only_generated_block CLAUDE.md; then
    git checkout --quiet -- CLAUDE.md
  fi
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "${RED}A newer version is on GitHub, but this Codespace has changes of its own, so it was not updated.${OFF}"
    echo "${DIM}Changed here:${OFF}"; git status --short | head -10
    return 0
  fi
  if ! git merge --ff-only --quiet "$upstream" 2>/dev/null; then
    echo "${RED}A newer version is on GitHub, but it could not be applied automatically.${OFF}"
    return 0
  fi

  after=$(git rev-parse HEAD)
  echo "${GREEN}Updated to the latest version.${OFF}"
  if ! git diff --quiet "$before" "$after" -- package.json package-lock.json; then
    echo "Installing what the new version needs. This takes a couple of minutes…"
    npm install --no-audit --no-fund || echo "${RED}Installing failed; the site may not start until it is run again.${OFF}"
  fi
  UPDATED=1
}
update_code

# `--restart` stops a running site first, so code you just pulled — and in
# particular next.config.ts, which Next only reads at startup — takes effect.
# Ctrl+C is not on a phone keyboard, so this is the phone-friendly way to stop
# it. The patterns match Next's own processes and nothing else in a Codespace.
# A site already running when an update arrives is restarted the same way, so
# the update is what the owner sees.
if { [ "${1:-}" = "--restart" ] || [ -n "$UPDATED" ]; } && port_in_use; then
  echo "Stopping the running site…"
  pkill -f "next dev" 2>/dev/null
  for _ in $(seq 1 20); do port_in_use || break; sleep 0.5; done
  if port_in_use; then
    pkill -f "next-server" 2>/dev/null
    for _ in $(seq 1 10); do port_in_use || break; sleep 0.5; done
  fi
  if port_in_use; then
    echo "${RED}Couldn't stop it. Close every terminal (trash-can icon), open a new one, and run this again.${OFF}"
    exit 1
  fi
fi

# Reopening a Codespace that is still running attaches a second time. Starting
# another dev server then would make Next hop to port 3001, whose address
# matches nothing above — so if one is already listening, just say where it is.
if port_in_use; then
  cat <<BANNER

${GREEN}${BOLD}BAD ERA is already running.${OFF}

  Studio       ${SITE}/studio
  Storefront   ${SITE}
${SIGNIN_LINE}

${DIM}It updates itself from GitHub each time the Codespace opens.
To check again now:  bash .devcontainer/start.sh --restart${OFF}

BANNER
  exit 0
fi

MISSING=()
for VAR in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  if [ -z "${!VAR:-}" ]; then MISSING+=("$VAR"); fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  cat <<BANNER

${RED}${BOLD}BAD ERA can't start yet — it needs your Supabase keys.${OFF}

Missing: ${BOLD}${MISSING[*]}${OFF}

Easiest fix:
  1. Open ${BOLD}github.com/settings/codespaces${OFF}
  2. ${BOLD}New secret${OFF} for each name above. Values are on
     supabase.com/dashboard/project/snkvgpfpnphvbkiafptd/settings/api
       NEXT_PUBLIC_SUPABASE_ANON_KEY  = the "anon" / "publishable" key
       SUPABASE_SERVICE_ROLE_KEY      = the "service_role" key (secret)
  3. Under "Repository access", choose ${BOLD}BAD-ERA-2.0${OFF}
  4. Come back here and reload the page. If it still says this, open the
     menu (☰) -> Command Palette -> ${BOLD}Codespaces: Rebuild Container${OFF}

${DIM}Secrets are stored encrypted by GitHub and never committed to the repo.${OFF}

BANNER
  exit 0
fi

cat <<BANNER

${GREEN}${BOLD}Starting BAD ERA…${OFF}  ${DIM}(first page load compiles, give it ~20 seconds)${OFF}

  Studio       ${SITE}/studio
  Storefront   ${SITE}
${SIGNIN_LINE}

${DIM}A browser tab opens by itself once it is ready. If it does not, open the
PORTS tab, find port 3000, and tap the globe icon.

Leave this terminal open — closing it stops the site.
Press Ctrl+C to stop. Type "npm run dev" to start again.${OFF}

BANNER

exec npm run dev

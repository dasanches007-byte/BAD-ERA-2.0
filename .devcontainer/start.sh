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
if [ -n "${CODESPACES:-}" ] || [ -e "$CS_FILE" ] || [ -n "$CS_NAME" ]; then IN_CODESPACE=1; fi

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

# One line that says exactly which address sign-in will accept, so a mismatch
# is visible on screen instead of surfacing later as an opaque E80.
if [ -n "$CS_NAME" ]; then
  SIGNIN_LINE="${DIM}Sign-in accepted from  ${CS_NAME}-3000.${CS_DOMAIN}${OFF}"
elif [ -n "$IN_CODESPACE" ]; then
  SIGNIN_LINE="${RED}${BOLD}Couldn't find this Codespace's name, so sign-in will be refused.${OFF}
${RED}Take a screenshot of this message and send it to Claude.${OFF}"
else
  SIGNIN_LINE=""
fi

port_in_use() { (exec 3<>/dev/tcp/127.0.0.1/3000) 2>/dev/null; }

# `--restart` stops a running site first, so code you just pulled — and in
# particular next.config.ts, which Next only reads at startup — takes effect.
# Ctrl+C is not on a phone keyboard, so this is the phone-friendly way to stop
# it. The patterns match Next's own processes and nothing else in a Codespace.
if [ "${1:-}" = "--restart" ] && port_in_use; then
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

${DIM}Just pulled new code? Run:  bash .devcontainer/start.sh --restart${OFF}

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

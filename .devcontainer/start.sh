#!/usr/bin/env bash
# Runs EVERY time the Codespace is opened (postAttachCommand).
#
# Configuration comes from Codespaces secrets entered on the "Create codespace"
# page, not from a .env.local file: editing a hidden dotfile on a phone keyboard
# is miserable, and this repository is public, so keys must never be committed.

set -uo pipefail

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'; OFF=$'\033[0m'

# Codespaces reaches the dev server through a forwarded address, not localhost.
# Sign-in redirects and Stripe return URLs are built from NEXT_PUBLIC_SITE_URL,
# so it must be that forwarded address or they land on a dead page.
if [ -n "${CODESPACE_NAME:-}" ]; then
  export NEXT_PUBLIC_SITE_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
fi
SITE="${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}"

# Reopening a Codespace that is still running attaches a second time. Starting
# another dev server then would make Next hop to port 3001, whose address
# matches nothing above — so if one is already listening, just say where it is.
if (exec 3<>/dev/tcp/127.0.0.1/3000) 2>/dev/null; then
  cat <<BANNER

${GREEN}${BOLD}BAD ERA is already running.${OFF}

  Studio       ${SITE}/studio
  Storefront   ${SITE}

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

${DIM}A browser tab opens by itself once it is ready. If it does not, open the
PORTS tab, find port 3000, and tap the globe icon.

Leave this terminal open — closing it stops the site.
Press Ctrl+C to stop. Type "npm run dev" to start again.${OFF}

BANNER

exec npm run dev

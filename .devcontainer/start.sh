#!/usr/bin/env bash
# Runs EVERY time the Codespace is opened.
#
# Reads configuration from Codespaces secrets rather than a .env.local file.
# Editing a hidden dotfile on a phone keyboard is miserable, and secrets are
# stored by GitHub rather than committed — which is the right place for a
# service-role key regardless of the device.

set -uo pipefail

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'; OFF=$'\033[0m'

MISSING=()
for VAR in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  if [ -z "${!VAR:-}" ]; then MISSING+=("$VAR"); fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  cat <<BANNER

${RED}${BOLD}BAD ERA is not configured yet.${OFF}

Missing: ${BOLD}${MISSING[*]}${OFF}

Add them once as Codespaces secrets, then rebuild:

  1. github.com/settings/codespaces
  2. ${BOLD}New secret${OFF} — add each name above, paste the value from
     Supabase -> Project Settings -> API
  3. Give each one access to the ${BOLD}BAD-ERA-2.0${OFF} repository
  4. Back here: Command Palette -> ${BOLD}Codespaces: Rebuild Container${OFF}

${DIM}Which value is which:
  NEXT_PUBLIC_SUPABASE_URL        the "Project URL"
  NEXT_PUBLIC_SUPABASE_ANON_KEY   the anon / publishable key
  SUPABASE_SERVICE_ROLE_KEY       the service_role key (secret)${OFF}

BANNER
  exit 0
fi

# Codespaces publishes forwarded ports on a public-ish URL of its own. Point
# the app at that URL rather than localhost so sign-in redirects land back
# here instead of on a dead address.
if [ -n "${CODESPACE_NAME:-}" ]; then
  export NEXT_PUBLIC_SITE_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
fi

cat <<BANNER

${GREEN}${BOLD}Starting BAD ERA…${OFF}

  Storefront   ${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}
  Studio       ${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}/studio

${DIM}A browser tab opens by itself once it is ready. If it does not, open the
PORTS tab, find port 3000, and tap the globe icon.

Press Ctrl+C to stop. Run "npm run dev" to start again.${OFF}

BANNER

npm run dev

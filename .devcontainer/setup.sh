#!/usr/bin/env bash
# Runs ONCE, when the Codespace is created.
set -euo pipefail

echo "Installing dependencies. This takes a couple of minutes…"
npm install --no-audit --no-fund

echo
echo "Setup complete."

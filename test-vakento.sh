#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

export VAKENTO_BASE_URL="${VAKENTO_BASE_URL:-https://vakento.nl}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js ontbreekt. Installeer Node 20 of nieuwer."
  exit 1
fi

if [ ! -d node_modules/@playwright/test ]; then
  echo "Playwright installeren..."
  npm install
fi

if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo "Chromium voor Playwright installeren..."
  npx playwright install chromium
fi

if [ -n "${VAKENTO_TEST_EMAIL:-}" ] && [ -n "${VAKENTO_TEST_PASSWORD:-}" ] && [ "${VAKENTO_ALLOW_WRITE_TESTS:-0}" = "1" ]; then
  echo "Volledige Vakento gebruikerstest wordt uitgevoerd."
else
  echo "Geen schrijf-testaccount ingesteld: publieke smoke-tests worden uitgevoerd."
  echo "Voor de volledige test: zet VAKENTO_TEST_EMAIL, VAKENTO_TEST_PASSWORD en VAKENTO_ALLOW_WRITE_TESTS=1."
fi

npx playwright test "$@"

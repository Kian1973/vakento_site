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

echo "Chromium en Linux-afhankelijkheden voor Playwright controleren..."
npx playwright install --with-deps chromium

if [ -n "${VAKENTO_TEST_EMAIL:-}" ] && [ -n "${VAKENTO_TEST_PASSWORD:-}" ] && [ "${VAKENTO_ALLOW_WRITE_TESTS:-0}" = "1" ]; then
  echo "Volledige Vakento gebruikerstest wordt uitgevoerd."
else
  echo "Geen schrijf-testaccount ingesteld: publieke smoke-tests worden uitgevoerd."
  echo "Voor de volledige test: zet VAKENTO_TEST_EMAIL, VAKENTO_TEST_PASSWORD en VAKENTO_ALLOW_WRITE_TESTS=1."
fi

npx playwright test "$@"

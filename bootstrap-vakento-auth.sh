#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

export VAKENTO_BASE_URL="${VAKENTO_BASE_URL:-https://vakento.nl}"

read -rp "Vakento test e-mailadres: " VAKENTO_TEST_EMAIL
read -rsp "Vakento test wachtwoord: " VAKENTO_TEST_PASSWORD
echo
read -rp "Huidige 6-cijferige Google Authenticator-code: " VAKENTO_TEST_2FA_CODE

export VAKENTO_TEST_EMAIL VAKENTO_TEST_PASSWORD VAKENTO_TEST_2FA_CODE
mkdir -p .auth
chmod 700 .auth

PATH=/opt/node20/bin:$PATH npx playwright install --with-deps chromium >/dev/null
PATH=/opt/node20/bin:$PATH node tests/e2e/bootstrap-auth.mjs

chmod 600 .auth/vakento.json 2>/dev/null || true
unset VAKENTO_TEST_EMAIL VAKENTO_TEST_PASSWORD VAKENTO_TEST_2FA_CODE

echo
echo "Klaar. De automatische tester kan deze vertrouwde sessie hergebruiken."
echo "Start de volledige test met:"
echo "  export VAKENTO_ALLOW_WRITE_TESTS=1"
echo "  PATH=/opt/node20/bin:\$PATH bash test-vakento.sh"

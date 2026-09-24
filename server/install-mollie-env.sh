#!/usr/bin/env bash
set -euo pipefail

SERVICE="${VAKENTO_SERVICE:-vakento-brein.service}"
CONF="/etc/vakento-mollie.conf"
DROPIN_DIR="/etc/systemd/system/${SERVICE}.d"
DROPIN="${DROPIN_DIR}/mollie.conf"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Voer dit script uit als root."
  exit 1
fi

read -rsp "Mollie API-key (test_... of live_...): " MOLLIE_API_KEY
echo

if [[ ! "${MOLLIE_API_KEY}" =~ ^(test|live)_ ]]; then
  echo "Ongeldige sleutel. Verwacht een Mollie test_... of live_... API-key."
  exit 1
fi

install -m 600 /dev/null "${CONF}"
{
  printf 'MOLLIE_API_KEY=%q\n' "${MOLLIE_API_KEY}"
  printf 'VAKENTO_BASE_URL=%q\n' "https://vakento.nl"
  printf 'VAKENTO_PRO_AMOUNT=%q\n' "35.09"
} > "${CONF}"

mkdir -p "${DROPIN_DIR}"
cat > "${DROPIN}" <<EOF
[Service]
EnvironmentFile=${CONF}
EOF

chmod 600 "${CONF}"
chmod 644 "${DROPIN}"

unset MOLLIE_API_KEY

systemctl daemon-reload
systemctl restart "${SERVICE}"
systemctl --no-pager --full status "${SERVICE}" | sed -n '1,16p'

echo
echo "Mollie-omgeving is gekoppeld aan ${SERVICE}."
echo "De geheime sleutel staat alleen in ${CONF} met rechten 600."

# Vakento calculator quota on VPS

The shared three-free-use counter is persisted by server/public-calculator-quota.py in SQLite, rather than localStorage. A random HttpOnly Secure cookie identifies a browser, not a unique human. Clearing cookies allows fresh attempts.

## Install (root on Ubuntu/Debian)

First verify the real Nginx document root. The example assumes /var/www/vakento.nl/web.

~~~bash
set -e
WEBROOT=/var/www/vakento.nl/web
test -f "$WEBROOT/index.html"
mkdir -p /opt/vakento-calculators /var/lib/vakento-calculators
curl -fsSL https://raw.githubusercontent.com/Kian1973/vakento_site/main/server/public-calculator-quota.py -o /opt/vakento-calculators/public-calculator-quota.py
python3 -m py_compile /opt/vakento-calculators/public-calculator-quota.py
id vakentoquota >/dev/null 2>&1 || useradd --system --home /var/lib/vakento-calculators --shell /usr/sbin/nologin vakentoquota
chown -R vakentoquota:vakentoquota /var/lib/vakento-calculators
chmod 700 /var/lib/vakento-calculators
cat >/etc/systemd/system/vakento-calculator-quota.service <<'EOF'
[Unit]
Description=Vakento calculator quota
After=network.target
[Service]
Type=simple
User=vakentoquota
Group=vakentoquota
ExecStart=/usr/bin/python3 /opt/vakento-calculators/public-calculator-quota.py
Restart=on-failure
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/vakento-calculators
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now vakento-calculator-quota
curl -fsS http://127.0.0.1:38119/health
~~~

Add these two locations to the EXISTING HTTPS Nginx server block for vakento.nl, before general API routing, not as a new server block:

~~~nginx
location = /api/public-calculators/status {
    proxy_pass http://127.0.0.1:38119;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
}
location = /api/public-calculators/consume {
    limit_except POST { deny all; }
    proxy_pass http://127.0.0.1:38119;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
}
~~~

Check nginx -t, then systemctl reload nginx. Verify GET https://vakento.nl/api/public-calculators/status returns JSON before deploying the frontend. Download latest index.html, calculators.html, schilder-en-kluscalculator.html, assets/schilder-calculator.js from GitHub into the confirmed active document root, preserving permissions.

Test three calculations and fourth blocked, cross-page count, reload persistence. Note: the server checks a browser cookie; for strict per-person enforcement require verified registration and authenticate all API consumption server-side. HTTPS is required. Fail-closed behavior applies if the API is unavailable.

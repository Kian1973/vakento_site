#!/usr/bin/env bash
set -u

echo "========================================"
echo " VAKENTO SECURITY AUDIT - READ ONLY"
echo "========================================"
date
echo

echo "===== SYSTEEM ====="
uname -a 2>/dev/null || true
echo "Uptime: $(uptime -p 2>/dev/null || true)"
echo

echo "===== SERVICES ====="
for s in nginx ssh sshd fail2ban vakento-brein.service; do
  state=$(systemctl is-active "$s" 2>/dev/null || true)
  [ -n "$state" ] && echo "$s: $state"
done
echo

echo "===== OPEN POORTEN ====="
ss -lntup 2>/dev/null || ss -lntp 2>/dev/null || true
echo

echo "===== FIREWALL ====="
if command -v ufw >/dev/null 2>&1; then
  ufw status verbose 2>/dev/null || true
elif command -v nft >/dev/null 2>&1; then
  nft list ruleset 2>/dev/null | sed -n '1,220p'
else
  echo "Geen ufw/nft commando gevonden"
fi
echo

echo "===== FAIL2BAN ====="
if command -v fail2ban-client >/dev/null 2>&1; then
  fail2ban-client status 2>/dev/null || true
else
  echo "Fail2ban niet geinstalleerd"
fi
echo

echo "===== SSH BELEID ====="
if command -v sshd >/dev/null 2>&1; then
  sshd -T 2>/dev/null | grep -Ei '^(port|permitrootlogin|passwordauthentication|pubkeyauthentication|maxauthtries|logingracetime|allowusers|allowgroups|x11forwarding|permitemptypasswords) ' || true
else
  echo "sshd niet gevonden"
fi
echo

echo "===== NGINX CONFIG TEST ====="
nginx -t 2>&1 || true
echo

echo "===== VAKENTO HTTPS HEADERS ====="
curl -sS -I --max-time 15 https://vakento.nl/ 2>/dev/null | grep -Ei '^(HTTP/|server:|strict-transport-security:|content-security-policy:|x-content-type-options:|x-frame-options:|referrer-policy:|permissions-policy:|set-cookie:)' || true
echo

echo "===== HTTP -> HTTPS ====="
curl -sS -I --max-time 15 http://vakento.nl/ 2>/dev/null | sed -n '1,8p' || true
echo

echo "===== TLS CERTIFICAAT ====="
if command -v openssl >/dev/null 2>&1; then
  echo | openssl s_client -connect vakento.nl:443 -servername vakento.nl 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null || true
fi
echo

echo "===== VAKENTO SERVICE ====="
systemctl show vakento-brein.service -p User -p Group -p ExecStart -p ProtectSystem -p ProtectHome -p NoNewPrivileges -p PrivateTmp 2>/dev/null || true
echo

echo "===== BESTANDSRECHTEN ====="
for p in /var/www/vakento.nl /var/www/vakento.nl/web /var/www/vakento.nl/server /etc/vakento-mail-db.conf /etc/vakento.env /etc/vakento; do
  if [ -e "$p" ]; then
    stat -c '%A %a %U:%G %n' "$p" 2>/dev/null || true
  fi
done
echo

echo "===== BACKUPBESTANDEN IN WEBROOT ====="
find /var/www/vakento.nl/web -maxdepth 3 -type f \( -name '*.bak*' -o -name '*.backup*' -o -name '*.old' -o -name '*~' -o -name '*.sql' -o -name '*.env' \) -printf '%m %u:%g %p\n' 2>/dev/null | head -100
echo

echo "===== GEVOELIGE BESTANDEN PUBLIEK TEST ====="
for p in /.env /.git/config /package.json /server/ai.mjs /backup.zip; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "https://vakento.nl$p" 2>/dev/null || echo ERR)
  echo "$code $p"
done
echo

echo "===== LOGIN/API BASIS ====="
for p in /api/me /api/login /api/password/forgot; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "https://vakento.nl$p" 2>/dev/null || echo ERR)
  echo "$code GET $p"
done
echo

echo "===== RECENTE NGINX FOUTEN ====="
journalctl -u nginx --since "24 hours ago" --no-pager -p warning..alert 2>/dev/null | tail -40 || true
echo

echo "===== RECENTE VAKENTO FOUTEN ====="
journalctl -u vakento-brein.service --since "24 hours ago" --no-pager -p warning..alert 2>/dev/null | tail -60 || true
echo

echo "===== KLAAR ====="
echo "Deze audit heeft niets gewijzigd."

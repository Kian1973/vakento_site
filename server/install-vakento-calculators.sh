#!/usr/bin/env bash
set -Eeuo pipefail
if [ "$(id -u)" -ne 0 ]; then echo "FOUT: draai als root." >&2; exit 1; fi
for cmd in nginx curl python3 systemctl useradd; do command -v "$cmd" >/dev/null || { echo "FOUT: $cmd ontbreekt"; exit 1; }; done
REPO="https://raw.githubusercontent.com/Kian1973/vakento_site/main"
TMP="$(mktemp -d)"
BACKUP="/root/vakento-calculator-backup-$(date +%Y%m%d-%H%M%S)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/assets" "$TMP/server" "$BACKUP"
echo "[1/6] Bestanden ophalen en controleren"
for f in calculators.html schilder-en-kluscalculator.html assets/schilder-calculator.js server/public-calculator-quota.py; do
  curl -fLsS --max-time 40 "$REPO/$f" -o "$TMP/$f"
  test -s "$TMP/$f"
done
python3 -m py_compile "$TMP/server/public-calculator-quota.py"
grep -q "var LIMIT = 3" "$TMP/calculators.html"
grep -q "const LIMIT = 3" "$TMP/assets/schilder-calculator.js"
grep -q "/api/public-calculators/consume" "$TMP/calculators.html"

echo "[2/6] Nginx-configuratie en webmap bepalen"
nginx -T > "$TMP/nginx.txt" 2> "$TMP/nginx.err" || { cat "$TMP/nginx.err"; exit 1; }
python3 - "$TMP/nginx.txt" "$TMP/selection" <<'PY'
import os,re,sys
data=open(sys.argv[1],encoding="utf-8",errors="replace").read()
heads=list(re.finditer(r"^# configuration file (/.+?):\s*$",data,re.M))
matches=[]
for i,h in enumerate(heads):
    path=h.group(1)
    if not os.path.isfile(path): continue
    fragment=data[h.end():heads[i+1].start() if i+1<len(heads) else len(data)]
    # Identify complete server blocks, retaining nesting.
    for m in re.finditer(r"\bserver\s*\{",fragment):
        depth=1; end=m.end()
        while end<len(fragment) and depth:
            if fragment[end]=="{": depth+=1
            if fragment[end]=="}": depth-=1
            end+=1
        if depth: continue
        block=fragment[m.end():end-1]
        if re.search(r"\bserver_name\s+[^;]*\bvakento\.nl\b[^;]*;",block) and re.search(r"\blisten\s+[^;]*\b443\b",block):
            matches.append((os.path.realpath(path),block))
matches=list({p:(p,b) for p,b in matches}.values())
if len(matches)!=1:
    # ISPConfig can expose the same domain through multiple generated configs.
    # Prefer the explicitly enabled Vakento website vhost, never the mail vhost.
    primary=[item for item in matches if os.path.basename(item[0])=="100-vakento.nl.vhost"]
    if len(primary)==1:
        matches=primary
if len(matches)!=1:
    raise SystemExit("FOUT: Geen eenduidige Vakento HTTPS-vhost: "+str(len(matches))+" matches. Kandidaten: "+repr([p for p,_ in matches]))
vhost,block=matches[0]
roots=re.findall(r"(?m)^\s*root\s+([^;]+);",block)
candidates=roots+["/var/www/vakento.nl/web","/var/www/vakento.nl/public_html"]
webroot=next((x.strip() for x in candidates if os.path.isfile(os.path.join(x.strip(),"index.html")) and "vakento" in open(os.path.join(x.strip(),"index.html"),encoding="utf-8",errors="replace").read(40000).lower()),None)
if not webroot: raise SystemExit("FOUT: Vakento-documentroot niet gevonden. Geen wijzigingen.")
if re.search(r"location\s+=\s*/api/public-calculators/(status|consume)",block):
    raise SystemExit("FOUT: Er bestaan al calculator API-routes. Niet overschrijven.")
open(sys.argv[2],"w").write(vhost+"\n"+webroot+"\n")
print("Nginx:",vhost,"\nWebmap:",webroot)
PY
VHOST="$(sed -n '1p' "$TMP/selection")"
WEBROOT="$(sed -n '2p' "$TMP/selection")"
cp -p "$VHOST" "$BACKUP/nginx.conf"
for f in calculators.html schilder-en-kluscalculator.html assets/schilder-calculator.js; do
  mkdir -p "$BACKUP/$(dirname "$f")"
  test ! -f "$WEBROOT/$f" || cp -p "$WEBROOT/$f" "$BACKUP/$f"
done

echo "[3/6] SQLite-service installeren"
mkdir -p /opt/vakento-calculators /var/lib/vakento-calculators
id vakentoquota >/dev/null 2>&1 || useradd --system --home /var/lib/vakento-calculators --shell /usr/sbin/nologin vakentoquota
chown vakentoquota:vakentoquota /var/lib/vakento-calculators
chmod 700 /var/lib/vakento-calculators
install -o root -g root -m 644 "$TMP/server/public-calculator-quota.py" /opt/vakento-calculators/public-calculator-quota.py
cat > /etc/systemd/system/vakento-calculator-quota.service <<'UNIT'
[Unit]
Description=Vakento Calculator Quota
After=network.target
[Service]
Type=simple
User=vakentoquota
Group=vakentoquota
ExecStart=/usr/bin/python3 /opt/vakento-calculators/public-calculator-quota.py
Restart=on-failure
RestartSec=3
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/vakento-calculators
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now vakento-calculator-quota
systemctl restart vakento-calculator-quota
curl -fLsS --retry 4 --retry-delay 1 http://127.0.0.1:38119/health >/dev/null

echo "[4/6] Nginx API-routes koppelen"
cat > /etc/nginx/vakento-calculator-quota.inc <<'NGINX'
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
NGINX
python3 - "$VHOST" <<'PY'
import pathlib,re,sys
p=pathlib.Path(sys.argv[1]); text=p.read_text()
if "include /etc/nginx/vakento-calculator-quota.inc;" in text: raise SystemExit("FOUT: API-include bestaat al")
for m in re.finditer(r"\bserver\s*\{",text):
    depth=1; end=m.end()
    while end<len(text) and depth:
        if text[end]=="{": depth+=1
        if text[end]=="}": depth-=1
        end+=1
    block=text[m.end():end-1]
    if re.search(r"\bserver_name\s+[^;]*\bvakento\.nl\b[^;]*;",block) and re.search(r"\blisten\s+[^;]*\b443\b",block):
        text=text[:m.end()]+"\n    include /etc/nginx/vakento-calculator-quota.inc;\n"+text[m.end():]
        p.write_text(text)
        print("API-koppeling geplaatst")
        break
else: raise SystemExit("FOUT: Geen HTTPS-serverblok gevonden om te wijzigen.")
PY
if ! nginx -t; then
  cp -p "$BACKUP/nginx.conf" "$VHOST"
  nginx -t || true
  echo "FOUT: Nginx-koppeling mislukt; vorige configuratie teruggezet." >&2
  exit 1
fi
systemctl reload nginx

echo "[5/6] Live API controleren"
if ! curl -fLsS --max-time 15 --resolve vakento.nl:443:127.0.0.1 \
  https://vakento.nl/api/public-calculators/status -o "$TMP/quota.json"; then
  curl -fLsS --max-time 15 https://vakento.nl/api/public-calculators/status -o "$TMP/quota.json"
fi
python3 - "$TMP/quota.json" <<'PY'
import json,sys
x=json.load(open(sys.argv[1]))
assert x.get("limit")==3 and isinstance(x.get("remaining"),int), "API reageert onverwacht"
print("API bereikbaar:",x)
PY

echo "[6/6] Calculatorpagina's publiceren"
for f in calculators.html schilder-en-kluscalculator.html assets/schilder-calculator.js; do
  install -m 644 "$TMP/$f" "$WEBROOT/$f.new"
  chown --reference="$WEBROOT/index.html" "$WEBROOT/$f.new"
  mv "$WEBROOT/$f.new" "$WEBROOT/$f"
done
echo "KLAAR: drie gratis berekeningen worden geregistreerd op de VPS."
echo "Controleer: https://vakento.nl/schilder-en-kluscalculator.html"
echo "Back-up: $BACKUP"
echo "Beperking: de teller is per anonieme browsercookie, niet per persoon."

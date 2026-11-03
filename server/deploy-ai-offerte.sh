#!/usr/bin/env bash
set -Eeuo pipefail
# Alleen voor de Vakento-frontend, nadat PR #3 is gemerged en tests slagen.
# Gebruik: sudo bash server/deploy-ai-offerte.sh [COMMIT_SHA]
SHA="${1:-}"
if [[ ! "${SHA}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Geef expliciet de geteste 40-tekens commit-SHA op." >&2
  exit 2
fi
[[ $(id -u) -eq 0 ]] || { echo "Draai als root." >&2; exit 2; }
WEBROOT="/var/www/vakento.nl/web"
[[ -f "$WEBROOT/offertes.html" && -f "$WEBROOT/js/app.js" ]] || {
  echo "Vakento-documentroot niet gevonden: $WEBROOT. Geen bestanden aangepast." >&2
  exit 2
}
files=(werk.html offertes.html facturen.html js/gate.js js/app.js js/brein.js js/offerte-btw.js)
tmp=$(mktemp -d)
backup="/root/vakento-ai-offerte-backup-$(date +%Y%m%d-%H%M%S)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp"
base="https://raw.githubusercontent.com/Kian1973/vakento_site/$SHA"
for f in "${files[@]}"; do
  mkdir -p "$tmp/$(dirname "$f")"
  curl -fsSL --max-time 30 "$base/$f" -o "$tmp/$f"
  [[ -s "$tmp/$f" ]] || { echo "Leeg bestand: $f" >&2; exit 1; }
done
grep -q "ai-offerte-20261027" "$tmp/js/app.js"
grep -q 'offerteBtwVoorstel' "$tmp/js/app.js"
grep -q "ai-offerte-20261027" "$tmp/werk.html"
grep -q "ai-offerte-20261027" "$tmp/offertes.html"
grep -q "ai-offerte-20261027" "$tmp/facturen.html"
if command -v node >/dev/null 2>&1; then
  node --check "$tmp/js/app.js"
  node --check "$tmp/js/brein.js"
  node --check "$tmp/js/gate.js"
  node --check "$tmp/js/offerte-btw.js"
fi
mkdir -p "$backup"
for f in "${files[@]}"; do
  mkdir -p "$backup/$(dirname "$f")"
  if [[ -e "$WEBROOT/$f" ]]; then cp -p "$WEBROOT/$f" "$backup/$f"; fi
done
printf '%s\n' "$SHA" > "$backup/commit-sha.txt"
echo "Back-up: $backup"
for f in "${files[@]}"; do
  mkdir -p "$WEBROOT/$(dirname "$f")"
  if [[ -e "$WEBROOT/$f" ]]; then
    chown --reference="$WEBROOT/$f" "$tmp/$f"
    chmod --reference="$WEBROOT/$f" "$tmp/$f"
  else
    chmod 644 "$tmp/$f"
  fi
  cp -p "$tmp/$f" "$WEBROOT/$f"
done
echo "Frontend gepubliceerd. Controleer offertes in privervenster, inclusief btw en opslaan."
echo "Rollback: herstel de bestanden uit $backup naar $WEBROOT."

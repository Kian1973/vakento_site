#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Kian1973/vakento_site.git"
REPO_DIR="${REPO_DIR:-/opt/vakento-site}"
SITE_ROOT="${SITE_ROOT:-/var/www/vakento.nl/web}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/vakento-site}"

if [ ! -d "$SITE_ROOT" ]; then
  echo "STOP: sitepad bestaat niet: $SITE_ROOT"
  echo "Gebruik bijvoorbeeld: SITE_ROOT=/juiste/map bash scripts/deploy-vps.sh"
  exit 1
fi

if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" fetch origin main
  git -C "$REPO_DIR" reset --hard origin/main
else
  rm -rf "$REPO_DIR"
  git clone --branch main --single-branch "$REPO_URL" "$REPO_DIR"
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$BACKUP_ROOT/$STAMP"
mkdir -p "$BACKUP/assets"

for FILE in index.html assets/vakento-home.css assets/vakento-home.js; do
  if [ -e "$SITE_ROOT/$FILE" ]; then
    mkdir -p "$BACKUP/$(dirname "$FILE")"
    cp -a "$SITE_ROOT/$FILE" "$BACKUP/$FILE"
  fi
done

mkdir -p "$SITE_ROOT/assets"
install -m 0644 "$REPO_DIR/index.html" "$SITE_ROOT/index.html"
install -m 0644 "$REPO_DIR/assets/vakento-home.css" "$SITE_ROOT/assets/vakento-home.css"
install -m 0644 "$REPO_DIR/assets/vakento-home.js" "$SITE_ROOT/assets/vakento-home.js"
chown www-data:www-data "$SITE_ROOT/index.html" "$SITE_ROOT/assets/vakento-home.css" "$SITE_ROOT/assets/vakento-home.js"

echo "Vakento homepage gepubliceerd."
echo "Backup: $BACKUP"
echo "Bron: $REPO_DIR"
echo "Doel: $SITE_ROOT"

#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Kian1973/vakento_site.git"
REPO_DIR="${REPO_DIR:-/opt/vakento-site}"

if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" fetch origin main
  git -C "$REPO_DIR" reset --hard origin/main
else
  rm -rf "$REPO_DIR"
  git clone --branch main --single-branch "$REPO_URL" "$REPO_DIR"
fi

echo "GitHub koppeling klaar in $REPO_DIR"
git -C "$REPO_DIR" remote -v
git -C "$REPO_DIR" log -1 --oneline

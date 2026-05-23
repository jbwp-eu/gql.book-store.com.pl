#!/usr/bin/env bash
# Run on EC2 as ubuntu after rsync (GitHub Actions v2).
set -euo pipefail

APP_ROOT=/var/www/gql-book-store
RELEASE_SHA="${1:?Usage: activate-release.sh <git-sha>}"

RELEASE="$APP_ROOT/releases/$RELEASE_SHA"
[[ -d "$RELEASE" ]] || { echo "Missing release: $RELEASE"; exit 1; }

cd "$RELEASE"
ln -sfn ../shared/.env.production .env.production
ln -sfn ../shared/data data
ln -sfn ../shared/uploads uploads
npm ci --omit=dev
ln -sfn "$RELEASE" "$APP_ROOT/current"
sudo systemctl restart gql-book-store
sleep 2
curl -sf http://127.0.0.1:4000/ >/dev/null
echo "Activated $RELEASE_SHA"

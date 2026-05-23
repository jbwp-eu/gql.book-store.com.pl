#!/usr/bin/env bash
# Smoke test deployed app (run from laptop or CI with DEPLOY_BASE_URL set).
set -euo pipefail

BASE="${DEPLOY_BASE_URL:-https://gql.book-store.com.pl}"
BASE="${BASE%/}"

echo "==> GET $BASE/"
curl -sfS "$BASE/" | head -c 200 >/dev/null
echo " OK"

echo "==> POST $BASE/graphql"
RESP=$(curl -sfS -X POST "$BASE/graphql" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ products { id title } }"}')
echo "$RESP" | grep -q '"products"' && echo " OK" || { echo "$RESP"; exit 1; }

echo "==> GET $BASE/images/ (dir may 404 without file — check server responds)"
code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/images/" || true)
echo " HTTP $code"

echo "All smoke checks passed for $BASE"

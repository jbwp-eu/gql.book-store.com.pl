#!/usr/bin/env bash
# Smoke test deployed app (run from laptop or CI with DEPLOY_BASE_URL_AWS set).
# Legacy: DEPLOY_BASE_URL is still accepted for backward compatibility.
set -euo pipefail
BASE="${DEPLOY_BASE_URL_AWS:-${DEPLOY_BASE_URL:-https://gql.book-store.pl}}"
BASE="${BASE%/}"
echo "==> GET $BASE/"
curl -sfS "$BASE/" | head -c 200 >/dev/null
echo " OK"
echo "==> POST $BASE/graphql"
RESP=$(curl -sfS -X POST "$BASE/graphql" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ products { id title } }"}')
echo "$RESP" | grep -q '"products"' && echo " OK" || { echo "$RESP"; exit 1; }
echo "All smoke checks passed for $BASE"

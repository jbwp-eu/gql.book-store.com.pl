#!/usr/bin/env bash
set -euo pipefail
BASE="${DEPLOY_BASE_URL:-https://gql.book-store.pl}"
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

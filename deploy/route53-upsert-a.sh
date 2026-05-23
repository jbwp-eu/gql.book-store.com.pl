#!/usr/bin/env bash
# Upsert Route 53 A record for gql.book-store.com.pl -> EC2 public IP (no Elastic IP).
#
# Usage:
#   export AWS_REGION=eu-central-1
#   export DEPLOY_HOST=203.0.113.10          # EC2 public IPv4
#   export R53_ZONE_NAME=book-store.pl       # hosted zone name
#   export R53_RECORD_NAME=gql.book-store.com.pl
#   bash deploy/route53-upsert-a.sh
set -euo pipefail

: "${AWS_REGION:=eu-central-1}"
: "${R53_ZONE_NAME:=book-store.pl}"
: "${R53_RECORD_NAME:=gql.book-store.com.pl}"
: "${TTL:=300}"

command -v aws >/dev/null || { echo "Install AWS CLI first"; exit 1; }

if [[ -z "${DEPLOY_HOST:-}" && -n "${INSTANCE_ID:-}" ]]; then
  DEPLOY_HOST=$(aws ec2 describe-instances --region "$AWS_REGION" \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
fi
: "${DEPLOY_HOST:?Set DEPLOY_HOST to EC2 public IPv4 or INSTANCE_ID=i-...}"

if [[ "$DEPLOY_HOST" == "None" || -z "$DEPLOY_HOST" ]]; then
  echo "No public IP on instance (is it running in a public subnet?)"
  exit 1
fi

ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name "$R53_ZONE_NAME" \
  --query "HostedZones[?Name=='${R53_ZONE_NAME}.'].Id" --output text | head -1)
[[ -n "$ZONE_ID" ]] || { echo "Hosted zone not found: $R53_ZONE_NAME"; exit 1; }
ZONE_ID="${ZONE_ID#/hostedzone/}"

CHANGE_BATCH=$(cat <<EOF
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "${R53_RECORD_NAME}.",
      "Type": "A",
      "TTL": ${TTL},
      "ResourceRecords": [{ "Value": "${DEPLOY_HOST}" }]
    }
  }]
}
EOF
)

aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" --change-batch "$CHANGE_BATCH"
echo "UPSERT A ${R53_RECORD_NAME} -> ${DEPLOY_HOST} (zone ${R53_ZONE_NAME})"
echo "Verify: dig +short ${R53_RECORD_NAME}"

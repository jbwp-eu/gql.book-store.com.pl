#!/usr/bin/env bash
# Optional: create security group + Ubuntu EC2 via AWS CLI (no Elastic IP).
# Requires: aws CLI, credentials, default VPC.
#
# Usage:
#   export AWS_REGION=eu-central-1
#   export KEY_NAME=my-key-pair        # existing EC2 key pair name
#   export MY_IP=$(curl -sS https://checkip.amazonaws.com)/32
#   bash deploy/aws-setup.sh
set -euo pipefail

: "${AWS_REGION:=eu-central-1}"
: "${KEY_NAME:?Set KEY_NAME to an existing EC2 key pair}"
: "${MY_IP:?Set MY_IP e.g. $(curl -sS https://checkip.amazonaws.com)/32}"
: "${INSTANCE_TYPE:=t3.small}"

SG_NAME=gql-book-store-sg
INSTANCE_NAME=gql-book-store

command -v aws >/dev/null || { echo "Install AWS CLI first"; exit 1; }

VPC_ID=$(aws ec2 describe-vpcs --region "$AWS_REGION" --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text)
[[ "$VPC_ID" != "None" && -n "$VPC_ID" ]] || { echo "No default VPC"; exit 1; }

SG_ID=$(aws ec2 describe-security-groups --region "$AWS_REGION" \
  --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)

if [[ -z "$SG_ID" || "$SG_ID" == "None" ]]; then
  echo "==> Creating security group $SG_NAME"
  SG_ID=$(aws ec2 create-security-group --region "$AWS_REGION" \
    --group-name "$SG_NAME" --description "gql book store" --vpc-id "$VPC_ID" \
    --query GroupId --output text)
  aws ec2 authorize-security-group-ingress --region "$AWS_REGION" --group-id "$SG_ID" \
    --ip-permissions \
    "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=$MY_IP,Description=ssh-admin}]" \
    "IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0,Description=http}]" \
    "IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0,Description=https}]"
else
  echo "==> Using existing security group $SG_ID"
fi

AMI_ID=$(aws ec2 describe-images --region "$AWS_REGION" \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text)

echo "==> Launching $INSTANCE_TYPE ($AMI_ID)"
INSTANCE_ID=$(aws ec2 run-instances --region "$AWS_REGION" \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --associate-public-ip-address \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
  --query 'Instances[0].InstanceId' --output text)

aws ec2 wait instance-running --region "$AWS_REGION" --instance-ids "$INSTANCE_ID"
PUBLIC_IP=$(aws ec2 describe-instances --region "$AWS_REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo ""
echo "InstanceId: $INSTANCE_ID"
echo "PublicIp:   $PUBLIC_IP"
echo "SecurityGroup: $SG_ID"
echo ""
echo "Next:"
echo "  1. Route 53 A record gql.book-store.com.pl -> $PUBLIC_IP"
echo "     INSTANCE_ID=$INSTANCE_ID bash deploy/route53-upsert-a.sh"
echo "     (or DEPLOY_HOST=$PUBLIC_IP bash deploy/route53-upsert-a.sh)"
echo "  2. scp -r -i ~/.ssh/$KEY_NAME.pem deploy ubuntu@$PUBLIC_IP:/tmp/"
echo "     ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP 'sudo bash /tmp/deploy/bootstrap.sh'"

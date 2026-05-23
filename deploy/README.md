# Deploy gql.book-store.com.pl to EC2 (Caddy + GitHub Actions) — v1

Single Ubuntu EC2: **Caddy** (HTTPS) → **Node** on `127.0.0.1:4000`. DNS via **Route 53** (no Elastic IP).

**Alternative (manual console + single `ubuntu` key):** [deploy-ver.2/README.md](../deploy-ver.2/README.md)

## Quick checklist

| Step | Action |
|------|--------|
| 1 | Create EC2 ([aws-setup.sh](aws-setup.sh) or AWS Console) |
| 2 | Route 53 A record → public IP ([route53-upsert-a.sh](route53-upsert-a.sh)) |
| 3 | `scp -r deploy ubuntu@IP:/tmp/deploy && ssh sudo bash /tmp/deploy/bootstrap.sh` |
| 4 | Configure deploy SSH key + [GITHUB_SECRETS.md](GITHUB_SECRETS.md) |
| 5 | Edit `/var/www/gql-book-store/shared/.env.production` |
| 6 | Push to `main` or run workflow_dispatch |
| 7 | [smoke-test.sh](smoke-test.sh) |

---

## 1. EC2 (no Elastic IP)

**Console:** Ubuntu 24.04, `t3.small`, public subnet, auto-assign public IP, security group:

- TCP 22 — your IP (and/or GitHub runner IPs for deploy)
- TCP 80, 443 — `0.0.0.0/0`

**CLI (optional):**

```bash
export AWS_REGION=eu-central-1
export KEY_NAME=your-key-pair
export MY_IP="$(curl -sS https://checkip.amazonaws.com)/32"
bash deploy/aws-setup.sh
```

Save **InstanceId** and **PublicIp** from output.

---

## 2. Route 53 (book-store.pl zone)

See [ROUTE53.md](ROUTE53.md) for AWS Console steps.

```bash
export DEPLOY_HOST=<EC2-public-IPv4>
# or: export INSTANCE_ID=i-xxxxxxxx
bash deploy/route53-upsert-a.sh
dig +short gql.book-store.com.pl
```

**Note:** Public IP changes if the instance is stopped/started without Elastic IP — re-run this script.

---

## 3. Bootstrap server

```bash
scp -r -i your.pem deploy ubuntu@<public-ip>:/tmp/
ssh -i your.pem ubuntu@<public-ip> \
  'sudo DEPLOY_DOMAIN=gql.book-store.com.pl bash /tmp/deploy/bootstrap.sh'
```

Installs: Node 22, Caddy, `gqlapp` + `deploy` users, systemd unit, sudoers for deploy.

```bash
# deploy user key (see GITHUB_SECRETS.md)
cat gql-deploy-key.pub | ssh ubuntu@IP 'sudo tee -a /home/deploy/.ssh/authorized_keys'
ssh ubuntu@IP 'sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys'
```

Edit env:

```bash
ssh ubuntu@IP 'sudo nano /var/www/gql-book-store/shared/.env.production'
```

---

## 4. GitHub Actions

Workflow: [`.github/workflows/deploy-ec2.yml`](../.github/workflows/deploy-ec2.yml)

Secrets: [GITHUB_SECRETS.md](GITHUB_SECRETS.md)

- `EC2_HOST=gql.book-store.com.pl`
- `EC2_USER=deploy`
- `EC2_SSH_KEY` = private key PEM

---

## 5. Verify

```bash
DEPLOY_BASE_URL=https://gql.book-store.com.pl bash deploy/smoke-test.sh
```

Stripe webhook: `https://gql.book-store.com.pl/webhooks/stripe`

---

## Layout on server

```
/var/www/gql-book-store/
├── current -> releases/<sha>/
├── releases/<sha>/     # new deploy each push
├── shared/
│   ├── .env.production
│   ├── data/store.db
│   └── uploads/
```

Manual activate (same as CI):

```bash
activate-release.sh <git-sha>
```

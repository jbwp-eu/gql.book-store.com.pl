# GitHub repository secrets

Configure under **Settings → Secrets and variables → Actions → New repository secret**.

## Required for deploy workflow

| Secret | Value |
|--------|--------|
| `EC2_HOST` | `gql.book-store.pl` (after Route 53 propagates) or EC2 public IP temporarily |
| `EC2_USER` | `deploy` |
| `EC2_SSH_KEY` | Full private PEM for the deploy user (include `-----BEGIN...` / `END...` lines) |

## Generate deploy key (local)

```bash
ssh-keygen -t ed25519 -f ./gql-deploy-key -N ""
# On EC2 (as ubuntu):
sudo mkdir -p /home/deploy/.ssh
sudo bash -c 'cat >> /home/deploy/.ssh/authorized_keys' < gql-deploy-key.pub
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
# GitHub secret EC2_SSH_KEY = contents of gql-deploy-key (private)
```

## App secrets (server only)

Do **not** put these in GitHub unless you automate `.env.production` creation. On the server copy from root [`.env.production.example`](../.env.production.example) (or paste from local `.env` and adjust) to `/var/www/gql-book-store/shared/.env.production`:

- `JWT_SECRET`, `ADMIN_PASSWORD`
- `DEPLOY_TARGET` (`ovh` | `aws`) and matching Stripe pair:
  - `STRIPE_SECRET_KEY_TEST_MODE_OVH` / `STRIPE_WEBHOOK_SECRET_TEST_MODE_OVH`
  - `STRIPE_SECRET_KEY_TEST_MODE_AWS` / `STRIPE_WEBHOOK_SECRET_TEST_MODE_AWS`
- `FRONTEND_ORIGIN`, `IMAGE_BASE_URL`, `DB_PATH`, `IMAGE_DIR`, `TRUST_PROXY`
- `PAYPAL_CLIENT_*`, `SMTP_*`
- `GOOGLE_MAPS_API_KEY_geocoding`

Frontend **build-time** `VITE_*` values are injected by deploy workflows:

| Kind | Name | Notes |
|------|------|--------|
| Secret | `VITE_GOOGLE_MAPS_API_KEY` | Maps JavaScript API key |
| Secret | `VITE_STRIPE_PUBLISHABLE_KEY_TEST_MODE_OVH` | Stripe `pk_…` (OVH deploy) |
| Secret | `VITE_STRIPE_PUBLISHABLE_KEY_TEST_MODE_AWS` | Stripe `pk_…` (EC2 deploy) |
| Secret | `VITE_PAYPAL_CLIENT_ID` | PayPal client id |
| **Variable** | `VITE_GOOGLE_MAPS_MAP_ID` | Map ID (all workflows: EC2 v1/v2 + OVH) |

Workflows also set `VITE_DEPLOY_TARGET` (`ovh` or `aws`) so the SPA picks the matching Stripe publishable key.

## GitHub repository variables (smoke tests)

| Variable | Value |
|----------|--------|
| `DEPLOY_BASE_URL_AWS` | `https://gql.book-store.pl` (EC2 workflows v1 + v2) |
| `DEPLOY_BASE_URL_OVH` | `https://gql.book-store.com.pl` (OVH workflow) |

## OVH deploy (`deploy-ovh.yml`)

| Secret | Value |
|--------|--------|
| `OVH_HOST` | Hostname or VPS IP |
| `OVH_SSH_KEY` | Full private SSH key |

Optional variable `OVH_USER` (default `ubuntu`). See [deploy-ovh/README.md](../deploy-ovh/README.md).

## Optional: GitHub CLI

```bash
gh secret set EC2_HOST -b"gql.book-store.pl"
gh secret set EC2_USER -b"deploy"
gh secret set EC2_SSH_KEY < gql-deploy-key
```

## SSH security group note

GitHub-hosted runners use changing IPs. Options: allow SSH from `0.0.0.0/0` with key-only auth, periodically update SG from [GitHub meta API](https://api.github.com/meta), or use a self-hosted runner in your VPC.

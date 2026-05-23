# GitHub repository secrets

Configure under **Settings → Secrets and variables → Actions → New repository secret**.

## Required for deploy workflow

| Secret | Value |
|--------|--------|
| `EC2_HOST` | `gql.book-store.com.pl` (after Route 53 propagates) or EC2 public IP temporarily |
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

Do **not** put these in GitHub unless you automate `.env.production` creation. Copy [shared.env.production.example](shared.env.production.example) to `/var/www/gql-book-store/shared/.env.production` on the server and fill in:

- `JWT_SECRET`, `ADMIN_PASSWORD`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `PAYPAL_CLIENT_*`, `SMTP_*`
- `GOOGLE_MAPS_API_KEY_geocoding`

Frontend **build-time** `VITE_*` keys: add to `frontend/.env.production` in repo or as workflow `env` if needed (Stripe publishable, PayPal client id, Maps).

## Optional: GitHub CLI

```bash
gh secret set EC2_HOST -b"gql.book-store.com.pl"
gh secret set EC2_USER -b"deploy"
gh secret set EC2_SSH_KEY < gql-deploy-key
```

## SSH security group note

GitHub-hosted runners use changing IPs. Options: allow SSH from `0.0.0.0/0` with key-only auth, periodically update SG from [GitHub meta API](https://api.github.com/meta), or use a self-hosted runner in your VPC.

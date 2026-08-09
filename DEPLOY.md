# Deployment

Production deploy: **Caddy** → Node on `127.0.0.1:4000`, layout `/var/www/gql-book-store/{current,releases,shared}`.

| Target | Guide | Workflow |
|--------|--------|----------|
| **EC2 v1** | [deploy/README.md](deploy/README.md) — optional CLI scripts, `deploy` user + separate deploy key | [deploy-ec2.yml](.github/workflows/deploy-ec2.yml) |
| **EC2 v2** | [deploy-ver.2/README.md](deploy-ver.2/README.md) — AWS/GitHub Console only, single `ubuntu` + EC2 `.pem` | [deploy-ec2-v2.yml](.github/workflows/deploy-ec2-v2.yml) |
| **OVH** | [deploy-ovh/README.md](deploy-ovh/README.md) — same directory layout as v2 | [deploy-ovh.yml](.github/workflows/deploy-ovh.yml) |

**Shared GitHub Actions variable (all deploy workflows):**

| Variable | Purpose |
|----------|---------|
| `VITE_GOOGLE_MAPS_MAP_ID` | Google Maps Map ID baked into the frontend at CI build time |

**Order confirmation emails (optional, v2 / SQS):** [deploy-ver.2/order-confirmation-lambda.md](deploy-ver.2/order-confirmation-lambda.md) — SQS + Lambda + SMTP when Stripe or PayPal marks an order paid.

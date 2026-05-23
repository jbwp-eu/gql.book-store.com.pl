# Route 53 — gql.book-store.com.pl (no Elastic IP)

Point subdomain **gql.book-store.com.pl** at the EC2 **public IPv4**. Re-run after stop/start or instance replacement.

## AWS Console

1. **EC2** → Instances → select instance → copy **Public IPv4 address**.
2. **Route 53** → **Hosted zones** → **book-store.pl**.
3. **Create record**:
   - **Record name:** `gql.book-store.com.pl` (or `gql` if the zone is `book-store.com.pl` — match your zone layout)
   - **Record type:** `A`
   - **Value:** EC2 public IPv4 (e.g. `203.0.113.10`)
   - **TTL:** `300`
   - **Routing policy:** Simple
4. Save. Wait for DNS propagation (often 1–5 minutes with TTL 300).

Verify:

```bash
dig +short gql.book-store.com.pl
# or
nslookup gql.book-store.com.pl
```

## AWS CLI

```bash
export AWS_REGION=eu-central-1
export DEPLOY_HOST=<EC2-public-IPv4>
bash deploy/route53-upsert-a.sh
```

Or resolve IP from instance id:

```bash
export INSTANCE_ID=i-0123456789abcdef0
bash deploy/route53-upsert-a.sh
```

## GitHub Actions

Set secret **`EC2_HOST`** to `gql.book-store.com.pl` once DNS resolves (preferred over raw IP for TLS and SSH host key stability).

## IP changed?

Without Elastic IP, a new public IP after stop/start requires updating the A record (Console or `route53-upsert-a.sh` again).

# Deploy v2 — manual AWS/GitHub + single `ubuntu` SSH key

Same architecture as v1 (one EC2, Caddy → Node on `127.0.0.1:4000`, Route 53, no Elastic IP), but:

- **No helper scripts** for AWS or bootstrap (`aws-setup.sh`, `bootstrap.sh`, etc.) — use the **AWS Console** and run the **commands below** on the server.
- **One Linux user:** `ubuntu` (default on Ubuntu AMI).
- **One key pair:** the EC2 `.pem` is used for your SSH **and** GitHub secret `EC2_SSH_KEY`.

Workflow: [`.github/workflows/deploy-ec2-v2.yml`](../.github/workflows/deploy-ec2-v2.yml)

---

## 1. AWS Console — EC2 key pair

1. **EC2** → **Key pairs** → **Create key pair**
2. Name e.g. `gql-book-store-key`, type **RSA** or **ED25519**, format **`.pem`**
3. Download and store safely (e.g. `~/gql-book-store-key.pem`)
4. On your laptop:

```bash
chmod 400 ~/gql-book-store-key.pem
```

---

## 2. AWS Console — security group

**EC2** → **Security groups** → **Create security group**

| Setting | Value |
|---------|--------|
| Name | `gql-book-store-sg` |
| VPC | default (or your VPC) |

**Inbound rules:**

| Type | Port | Source | Note |
|------|------|--------|------|
| SSH | 22 | My IP | Your laptop |
| SSH | 22 | `0.0.0.0/0` | *Optional,* only if GitHub Actions must SSH and you accept key-only auth |
| HTTP | 80 | `0.0.0.0/0` | Caddy + Let's Encrypt |
| HTTPS | 443 | `0.0.0.0/0` | Caddy |

Do **not** open port **4000** to the internet.

---

## 3. AWS Console — launch EC2

**EC2** → **Instances** → **Launch instance**

| Setting | Value |
|---------|--------|
| Name | `gql-book-store` |
| AMI | **Ubuntu Server 24.04 LTS** |
| Instance type | `t3.small` (or `t3.micro`) |
| Key pair | `gql-book-store-key` |
| Network | Public subnet, **Auto-assign public IP: Enable** |
| Security group | `gql-book-store-sg` |
| Storage | 20–30 GB gp3 |

**Launch** → note **Public IPv4** (e.g. `203.0.113.10`).

Test SSH:

```bash
ssh -i ~/gql-book-store-key.pem ubuntu@<PUBLIC_IP>
```

---

## 4. AWS Console — Route 53 (no Elastic IP)

**Route 53** → **Hosted zones** → **book-store.pl** → **Create record**

| Field | Value |
|-------|--------|
| Record name | `gql.book-store.com.pl` |
| Record type | **A** |
| Value | EC2 **Public IPv4** |
| TTL | 300 |

Save. Verify (laptop):

```bash
dig +short gql.book-store.com.pl
```

If you **stop/start** the instance, the public IP may change — update this A record in the console.

---

## 5. Server setup (SSH as `ubuntu`)

Connect:

```bash
ssh -i ~/gql-book-store-key.pem ubuntu@<PUBLIC_IP>
# or after DNS:
ssh -i ~/gql-book-store-key.pem ubuntu@gql.book-store.com.pl
```

Run the following **on the EC2 instance** (copy/paste block by block).

### 5.1 Packages

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl git build-essential rsync
```

### 5.2 Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

### 5.3 Caddy

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy
```

### 5.4 App directories (owned by `ubuntu`)

```bash
sudo mkdir -p /var/www/gql-book-store/{releases,shared/data,shared/uploads}
sudo chown -R ubuntu:ubuntu /var/www/gql-book-store
```

### 5.5 Production environment file

```bash
sudo nano /var/www/gql-book-store/shared/.env.production
```

Paste and edit (see [shared.env.production.example](shared.env.production.example)):

- `FRONTEND_ORIGIN=https://gql.book-store.com.pl`
- `IMAGE_BASE_URL=https://gql.book-store.com.pl/images`
- `JWT_SECRET`, Stripe, PayPal, SMTP, etc.

```bash
sudo chown ubuntu:ubuntu /var/www/gql-book-store/shared/.env.production
sudo chmod 600 /var/www/gql-book-store/shared/.env.production
```

### 5.6 Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

Use [Caddyfile.example](Caddyfile.example) (hostname `gql.book-store.com.pl` → `127.0.0.1:4000`).

```bash
sudo systemctl enable caddy
sudo systemctl reload caddy
```

### 5.7 systemd service (runs as `ubuntu`)

From your **laptop** (repo root):

```bash
scp -i ~/gql-book-store-key.pem deploy-ver.2/gql-book-store.service.example ubuntu@<PUBLIC_IP>:/tmp/
ssh -i ~/gql-book-store-key.pem ubuntu@<PUBLIC_IP> \
  'sudo cp /tmp/gql-book-store.service.example /etc/systemd/system/gql-book-store.service'
```

Or paste contents of [gql-book-store.service.example](gql-book-store.service.example) into `/etc/systemd/system/gql-book-store.service`.

```bash
sudo systemctl daemon-reload
sudo systemctl enable gql-book-store
```

### 5.8 Allow `ubuntu` to restart the app (passwordless)

```bash
echo 'ubuntu ALL=(root) NOPASSWD: /bin/systemctl restart gql-book-store, /bin/systemctl status gql-book-store' | sudo tee /etc/sudoers.d/gql-ubuntu
sudo chmod 440 /etc/sudoers.d/gql-ubuntu
sudo visudo -c -f /etc/sudoers.d/gql-ubuntu
```

### 5.9 Install activate script (used by GitHub Actions)

From your **laptop** (repo root), copy once:

```bash
scp -i ~/gql-book-store-key.pem deploy-ver.2/activate-release.sh ubuntu@<PUBLIC_IP>:/tmp/
ssh -i ~/gql-book-store-key.pem ubuntu@<PUBLIC_IP> \
  'sudo install -m 755 /tmp/activate-release.sh /usr/local/bin/activate-release-v2.sh'
```

---

## 6. GitHub — repository secrets (Console)

**GitHub** → your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Value |
|--------|--------|
| `EC2_HOST` | `gql.book-store.com.pl` (or public IP until DNS works) |
| `EC2_SSH_KEY` | **Entire** contents of `gql-book-store-key.pem` (private key) |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key (same as local `frontend/.env.local`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe **publishable** key (`pk_…`) for checkout |
| `VITE_PAYPAL_CLIENT_ID` | PayPal client id for checkout |

CI injects these at **frontend build** time (see `env:` on **Install and build** in `.github/workflows/deploy-ec2-v2.yml`). They are not read from `frontend/.env.local` on the runner.

**No separate `deploy` user.** Workflow uses **`ubuntu`** (fixed in workflow file).

Optional repository **variable**:

| Variable | Value |
|----------|--------|
| `DEPLOY_BASE_URL` | `https://gql.book-store.com.pl` (enables post-deploy smoke test in CI) |

---

## 7. Deploy application

**GitHub** → **Actions** → **Deploy to EC2 (v2 — ubuntu)** → **Run workflow**, or push to `main`.

The workflow will:

1. Run tests and `npm run build`
2. Rsync to `/var/www/gql-book-store/releases/<commit-sha>/`
3. SSH as `ubuntu` and run `activate-release-v2.sh <sha>`

### 7.1 Manual first deploy (optional test before CI)

On laptop after building locally, or trigger workflow once secrets are set.

---

## 8. Verify

```bash
curl -sS https://gql.book-store.com.pl/
curl -sS -X POST https://gql.book-store.com.pl/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ products { id title } }"}'
```

Or:

```bash
DEPLOY_BASE_URL=https://gql.book-store.com.pl bash deploy-ver.2/smoke-test.sh
```

On server:

```bash
sudo systemctl status gql-book-store
sudo systemctl status caddy
curl -sS http://127.0.0.1:4000/
```

Stripe webhook URL: `https://gql.book-store.com.pl/webhooks/stripe`

---

## 9. Layout on server

```
/var/www/gql-book-store/          # owner: ubuntu
├── current -> releases/<sha>/
├── releases/<sha>/
└── shared/
    ├── .env.production
    ├── data/store.db
    └── uploads/
```

---

## v1 vs v2

| | v1 (`deploy/`) | v2 (`deploy-ver.2/`) |
|--|----------------|----------------------|
| AWS / Route 53 | Optional CLI scripts | Console only |
| Bootstrap | `bootstrap.sh` | Commands in this README |
| SSH for CI | user `deploy` + separate key | user **`ubuntu`** + EC2 `.pem` |
| App process user | `gqlapp` | **`ubuntu`** |

---

## Troubleshooting

**GitHub SSH fails:** Security group must allow port 22 from GitHub runners (or `0.0.0.0/0` with key-only auth). `EC2_SSH_KEY` must be the full PEM, including header/footer lines.

**Permission denied on releases:** `sudo chown -R ubuntu:ubuntu /var/www/gql-book-store`

**Caddy certificate errors:** DNS must point to this server; ports 80/443 open.

**502 from Caddy:** `sudo systemctl status gql-book-store` — app not running; check logs: `journalctl -u gql-book-store -e`

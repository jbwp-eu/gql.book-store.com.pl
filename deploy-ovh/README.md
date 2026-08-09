# Deploy OVH — fresh VPS setup

Install the app on a new Ubuntu VPS with the same layout as EC2 v2.

Workflow: [`.github/workflows/deploy-ovh.yml`](../.github/workflows/deploy-ovh.yml)

```
/var/www/gql-book-store/          # owner: ubuntu (or vars.OVH_USER)
├── current -> releases/<sha>/
├── releases/<sha>/
└── shared/
    ├── .env.production
    ├── data/store.db
    └── uploads/
```

Caddy terminates HTTPS and proxies to Node on `127.0.0.1:4000`. DNS for `gql.book-store.com.pl` must point at this VPS before the first Caddy reload (Let's Encrypt).

---

## 1. Server setup (SSH as `ubuntu`)

### 1.1 Packages

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl git build-essential rsync
```

### 1.2 Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

### 1.3 Caddy

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy
```

### 1.4 App directories

```bash
sudo mkdir -p /var/www/gql-book-store/{releases,shared/data,shared/uploads}
sudo chown -R ubuntu:ubuntu /var/www/gql-book-store
```

### 1.5 Production environment

```bash
nano /var/www/gql-book-store/shared/.env.production
```

Paste from [shared.env.production.example](shared.env.production.example) and fill in secrets. Required for Maps:

- `NODE_ENV=production`
- `GOOGLE_MAPS_API_KEY_geocoding=…`
- `STORE_ADDRESS=…`
- `FRONTEND_ORIGIN=https://gql.book-store.com.pl`
- `DB_PATH` / `IMAGE_DIR` as in the example (`shared/data`, `shared/uploads`)

```bash
chmod 600 /var/www/gql-book-store/shared/.env.production
```

### 1.6 Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

Use [Caddyfile.example](Caddyfile.example) (hostname `gql.book-store.com.pl` → `127.0.0.1:4000`).

```bash
sudo systemctl enable caddy
sudo systemctl reload caddy
```

### 1.7 systemd

From your **laptop** (repo root):

```bash
scp -P 49152 deploy-ovh/gql-book-store.service.example ubuntu@<OVH_HOST>:/tmp/
ssh -p 49152 ubuntu@<OVH_HOST> \
  'sudo cp /tmp/gql-book-store.service.example /etc/systemd/system/gql-book-store.service'
ssh -p 49152 ubuntu@<OVH_HOST> 'sudo systemctl daemon-reload && sudo systemctl enable gql-book-store'
```

If the Linux user is not `ubuntu`, edit `User=` / `Group=` in the unit file.

### 1.8 Passwordless restart for CI

```bash
echo 'ubuntu ALL=(root) NOPASSWD: /bin/systemctl restart gql-book-store, /bin/systemctl status gql-book-store' | sudo tee /etc/sudoers.d/gql-ubuntu
sudo chmod 440 /etc/sudoers.d/gql-ubuntu
sudo visudo -c -f /etc/sudoers.d/gql-ubuntu
```

### 1.9 Install activate script

```bash
scp -P 49152 deploy-ovh/activate-release.sh ubuntu@<OVH_HOST>:/tmp/
ssh -p 49152 ubuntu@<OVH_HOST> \
  'sudo install -m 755 /tmp/activate-release.sh /usr/local/bin/activate-release-ovh.sh'
```

---

## 2. GitHub — secrets and variables

**Secrets** (Settings → Secrets and variables → Actions):

| Secret                        | Value                                    |
| ----------------------------- | ---------------------------------------- |
| `OVH_HOST`                    | `gql.book-store.com.pl` or VPS public IP |
| `OVH_SSH_KEY`                 | Full private SSH key (PEM / OpenSSH)     |

SSH port is **49152** (`OVH_SSH_PORT` in `deploy-ovh.yml`, same as nest). Use `-p 49152` / `scp -P 49152` locally.
| `VITE_GOOGLE_MAPS_API_KEY`    | Maps JavaScript API key (frontend build) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key                   |
| `VITE_PAYPAL_CLIENT_ID`       | PayPal client id                         |

**Variables:**

| Variable                  | Value                                                 |
| ------------------------- | ----------------------------------------------------- |
| `VITE_GOOGLE_MAPS_MAP_ID` | Map ID from Google Cloud (required for store map)     |
| `DEPLOY_BASE_URL_OVH`     | `https://gql.book-store.com.pl` (optional smoke test) |
| `OVH_USER`                | optional; default `ubuntu`                            |

Backend geocoding key stays only in `shared/.env.production` (`GOOGLE_MAPS_API_KEY_geocoding`).

Add the deploy public key to `~/.ssh/authorized_keys` on the VPS for the deploy user.

---

## 3. Deploy

**Actions** → **Deploy to OVH** → **Run workflow** (branch `main`).

1. Tests + `npm run build` (Vite gets `VITE_*` from secrets/vars)
2. Rsync → `/var/www/gql-book-store/releases/<sha>/`
3. SSH → `activate-release-ovh.sh <sha>`
4. Optional smoke against `DEPLOY_BASE_URL_OVH`

---

## 4. Verify

```bash
curl -sS https://gql.book-store.com.pl/
curl -sS -X POST https://gql.book-store.com.pl/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ storeLocation { name latitude longitude } }"}'
```

Expect non-zero `latitude` / `longitude` when geocoding env is correct.

```bash
sudo systemctl status gql-book-store
journalctl -u gql-book-store -e
```

---

## Troubleshooting

**`storeLocation` returns 0,0:** fix `GOOGLE_MAPS_API_KEY_geocoding` + `STORE_ADDRESS` in `shared/.env.production`, ensure `NODE_ENV=production`, restart `gql-book-store`. Test geocode with the key from that file on the VPS.

**Map blank in browser:** rebuild/deploy so `VITE_GOOGLE_MAPS_API_KEY` and `vars.VITE_GOOGLE_MAPS_MAP_ID` are baked in; allow referrer `https://gql.book-store.com.pl/*` on the JS key.

**SSH from Actions fails:** allow port **49152** for GitHub runners (or `0.0.0.0/0` with key-only auth); `OVH_SSH_KEY` must be the full private key.

**502 from Caddy:** `sudo systemctl status gql-book-store` — app not running yet until the first successful deploy.

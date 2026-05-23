#!/usr/bin/env bash
# One-time EC2 bootstrap (Ubuntu 24.04).
# Copy the whole deploy/ folder to the server, then:
#   sudo DEPLOY_DOMAIN=gql.book-store.com.pl bash /tmp/deploy/bootstrap.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT=/var/www/gql-book-store
DOMAIN="${DEPLOY_DOMAIN:-gql.book-store.com.pl}"

echo "==> Packages"
apt-get update
apt-get upgrade -y
apt-get install -y curl git build-essential rsync

echo "==> Node.js 22"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

echo "==> Caddy"
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

echo "==> App layout"
id -u gqlapp &>/dev/null || useradd -r -m -d "$APP_ROOT" -s /bin/bash gqlapp
mkdir -p "$APP_ROOT"/{releases,shared/data,shared/uploads}
chown -R gqlapp:gqlapp "$APP_ROOT/shared"

if [[ ! -f "$APP_ROOT/shared/.env.production" ]]; then
  cp "$SCRIPT_DIR/shared.env.production.example" "$APP_ROOT/shared/.env.production"
  chown gqlapp:gqlapp "$APP_ROOT/shared/.env.production"
  chmod 600 "$APP_ROOT/shared/.env.production"
  echo "Created $APP_ROOT/shared/.env.production — edit secrets before going live"
fi

echo "==> Caddyfile (hostname: $DOMAIN)"
if [[ -f "$SCRIPT_DIR/Caddyfile.example" ]]; then
  sed "s/gql.book-store.com.pl/${DOMAIN}/g" "$SCRIPT_DIR/Caddyfile.example" > /etc/caddy/Caddyfile
else
  cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
	reverse_proxy 127.0.0.1:4000 {
		header_up Host {host}
		header_up X-Forwarded-For {remote_host}
		header_up X-Forwarded-Proto {scheme}
	}
}
EOF
fi
systemctl enable caddy
systemctl reload caddy 2>/dev/null || systemctl restart caddy

echo "==> systemd unit gql-book-store"
cp "$SCRIPT_DIR/gql-book-store.service.example" /etc/systemd/system/gql-book-store.service
systemctl daemon-reload
systemctl enable gql-book-store

echo "==> deploy user (GitHub Actions)"
id -u deploy &>/dev/null || useradd -m -s /bin/bash deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
usermod -aG gqlapp deploy
install -d -o deploy -g gqlapp -m 775 "$APP_ROOT/releases"
cp "$SCRIPT_DIR/activate-release.sh" /usr/local/bin/activate-release.sh
chmod 755 /usr/local/bin/activate-release.sh

if [[ -f "$SCRIPT_DIR/sudoers-deploy.example" ]]; then
  cp "$SCRIPT_DIR/sudoers-deploy.example" /etc/sudoers.d/gql-deploy
  chmod 440 /etc/sudoers.d/gql-deploy
  visudo -c -f /etc/sudoers.d/gql-deploy
fi

echo ""
echo "Bootstrap done."
echo "  1. Add deploy SSH public key to /home/deploy/.ssh/authorized_keys"
echo "  2. Edit $APP_ROOT/shared/.env.production"
echo "  3. Route 53 A: $DOMAIN -> this instance public IP"
echo "  4. Push to main (GitHub secrets set) or run first deploy manually"
echo "  5. After first deploy: sudo systemctl start gql-book-store"

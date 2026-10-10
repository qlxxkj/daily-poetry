#!/usr/bin/env bash
# 一键装 nginx + 签 Let's Encrypt 证书, 把 1279 暴露成 HTTPS。
# 用法 (OCI 机器上):
#   1) 先让 nginx 以「80-only」方式能起来(见下方流程)
#   2) sudo bash install.sh <域名> <联系邮箱>     # 如: sudo bash install.sh poetry.70kj.vip you@example.com
#
# 前提:
#   1) OCI 安全组放通 80 + 443 入站
#   2) 若域走 Cloudflare 代理(橙云), 签 LE 前必须把这条记录临时改 灰云(DNS-only),
#      否则 LE 的 HTTP 验证被 CF 吃掉; 签完再改回橙云。
#   3) 1279 容器在跑 (docker compose up -d)
set -euo pipefail

DOMAIN="${1:-}"; EMAIL="${2:-}"
[ -z "$DOMAIN" ] && { echo "用法: sudo bash install.sh <域名> <联系邮箱>" >&2; exit 1; }
[ -z "$EMAIL" ]  && { echo "必须给联系邮箱 (LE 注册用, 仅用于过期提醒)" >&2; exit 1; }
echo "==> 域名: $DOMAIN   邮箱: $EMAIL"

# 1) 装 nginx
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx >/dev/null
echo "==> nginx 已装"

# 2) 写「80-only」配置先让 nginx 起来(无证书时 443 块无法载入)
CONF="/etc/nginx/sites-available/poetry"
mkdir -p /var/www/letsencrypt
cat > "$CONF" <<NG
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 301 https://\$host\$request_uri; }
}
NG
ln -sf "$CONF" /etc/nginx/sites-enabled/poetry
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl enable --now nginx && systemctl reload nginx
echo "==> nginx 80 已起来"

# 3) 签 Let's Encrypt (webroot 走 80)
certbot certonly --webroot -w /var/www/letsencrypt -d "$DOMAIN" \
  --non-interactive --agree-tos -m "$EMAIL"
echo "==> 证书已签"

# 4) 写回完整配置(80 + 443, 443 指到刚签的 LE 证书)
cat > "$CONF" <<NG
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 301 https://\$host\$request_uri; }
}
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};
    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:1279;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NG
nginx -t && systemctl reload nginx
echo "✅ 完成。验证: curl -sI https://$DOMAIN/api/v1/health   (期望 200)"
echo "   若域走 CF 代理, 现在把 CF 记录改回 橙云(代理); 小程序填 https://$DOMAIN"

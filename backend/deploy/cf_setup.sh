#!/usr/bin/env bash
# 用法: 把下面 PASTE_YOUR_TOKEN_HERE 换成你的完整 CF token，然后:
#   bash cf_setup.sh && sudo certbot certonly --dns-cloudflare \
#     --dns-cloudflare-credentials /root/cf.ini \
#     -d poetry.70kj.vip -d admin.poetry.70kj.vip \
#     --non-interactive --agree-tos -m a8926764@163.com

TOKEN="PASTE_YOUR_TOKEN_HERE"

cat > /root/cf.ini <<EOF
dns_cloudflare_email = a8926764@163.com
dns_cloudflare_api_token = ${TOKEN}
EOF
chmod 600 /root/cf.ini
echo "cf.ini written:"
cat /root/cf.ini

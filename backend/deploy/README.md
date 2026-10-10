# 部署:把本机 1279 古诗词 API 暴露成公网 HTTPS(OCI + nginx + Let's Encrypt + Cloudflare)

**Let's Encrypt 版** —— 这次实际跑通的:nginx 反代 + `certbot` 签证书,CF 只做前面的代理/加速。

## 原理

- OCI 安全组放行 80 + 443 入站,容器跑在本机 1279。
- `poetry.70kj.vip` 的 A 记录指向 OCI 公网 IP `207.211.161.100`。
- nginx 443 反代到 127.0.0.1:1279,证书由 Let's Encrypt 签发(自动续期)。
- **前提:签 LE 期间该记录必须是灰云(DNS-only)**。橙云(代理)会把 LE 的
  80 端口 HTTP 验证流量转走,签不出来;签完再改回橙云即可。

## 一键装

```bash
cd /home/hawk/claude/daily-poetry/deploy
# 先把 CF 记录 poetry.70kj.vip 改灰云
sudo bash install.sh poetry.70kj.vip you@example.com
```

脚本做:apt 装 nginx → 写「80-only」配置让 nginx 起来 →
`certbot certonly --webroot` 签证书 → 写回 80+443 完整配置(443 指向刚签的
LE 证书)→ `nginx -t` + 重载。

跑完后:

1. 验证:`curl -sI https://poetry.70kj.vip/api/v1/health` 期望 200。
2. 把 CF 记录改回**橙云**(代理),SSL 模式 **Full** 或 **Full(strict)**。
3. 小程序「设置」填 `https://poetry.70kj.vip`。

## 证书续期

certbot 装的是 webroot 版,自动加了 timer:

```bash
sudo certbot renew --dry-run        # 演练
sudo systemctl list-timers | grep certbot
```

LE 证书有效期 90 天,timer 在到期前自动续并 `systemctl reload nginx`,零维护。

## 521 排错(源站连接失败)

| 查 | 命令 / 位置 |
|---|---|
| OCI 443 开了没 | 安全组 Inbound 规则 |
| nginx 在监听 443 | `sudo ss -ltnp \| grep :443` |
| nginx 配置错 | `sudo nginx -t` |
| 证书对不对 | `/etc/letsencrypt/live/<域>/fullchain.pem` 在不在 |
| CF SSL 模式 | 选 Full/Full(strict),别用 Flexible |
| 签证时是不是橙云 | 灰云签、橙云跑;橙云时签会 521/验证失败 |

## nginx 版本注意

Debian/Ubuntu 自带 nginx 1.24 及以下:HTTP/2 写在 `listen 443 ssl http2;`
里;**不要**用 `http2 on;`(那是 1.25+ 的写法,1.24 会报 `unknown directive`)。

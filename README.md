# daily-poetry(每天吟诗:古诗词 API + 微信小程序)

自托管 [chinese-poetry-api](https://github.com/palemoky/chinese-poetry-api)(37 万首 唐诗/宋词/元曲,免 Key)
+ 一个薄微信小程序:今日一诗 / 飞花令 / 全文检索 / 简繁切换。

## 两层

```
┌─────────────────────────────────────────────┐
│  后端: chinese-poetry-api (Go+SQLite, 单容器) │
│  - REST: /api/v1/poems/random, /search, ...   │
│  - GraphQL: /graphql                          │
│  - 免 Key, IP 限速 10r/s                      │
└──────────────┬──────────────────────────────┘
               │  HTTPS (自托管域, 小程序需加白)
┌──────────────▼──────────────────────────────┐
│  小程序: miniapp/ (原生 wx, 无构建)          │
│  页:  今日一诗 / 飞花令 / 检索 / 设置         │
└─────────────────────────────────────────────┘
```

小程序 `wx.request` 只能打加白的 HTTPS 域,打不了 `127.0.0.1`。所以后端要暴露成公网 HTTPS(见「暴露」)。

## 部署后端

```bash
cd /home/hawk/claude/daily-poetry
docker compose up -d          # 起容器, 数据落 ./data (persist)
curl http://127.0.0.1:1279/api/v1/stats   # 37 万首验证
```

镜像 `palemoky/chinese-poetry-api:latest` 支持 amd64/arm64;SQLite 自包含,无需外部 DB。
换端口:改 `.env` 的 `PORT`。

## 暴露成 HTTPS(让小程序连上)

小程序要一个公网 HTTPS 域。推荐 Cloudflare Tunnel(免费,和上一套收件箱同理):

```bash
docker run --rm -it ghcr.io/cloudflare/cloudflared:latest \
  tunnel --no-tls-verify --url http://127.0.0.1:1279 run
# 或在 CF 后台建 Quick Tunnel, 拿到 https://xxx.trycloudflare.com
```

把这个域填到小程序「设置」页。**发布期**要在小程序后台把它加进
「开发设置 → 服务器域名 → request 合法域名」(必须 HTTPS)。开发期 devtools 勾「不校验合法域名」即可。

## 小程序

```bash
# 微信开发者工具导入 miniapp/
# 设置页填:  API 地址 = https://<你暴露的域>
# 测试连接 → 显示 "连接成功 · 371313 首诗"
```

4 页 tabBar:
| 页 | 功能 | 调的端点 |
|---|---|---|
| 今日一诗 | 随机一首,同日不重复,可切简繁/复制 | `GET /poems/random?lang=` |
| 飞花令 | 一字抽含它的一首诗 | `GET /poems/random?char=春` |
| 检索 | 标题/全文/作者检索 | `GET /poems/search?q=&type=all` |
| 设置 | API 地址 + 简繁 + 测连接 | `GET /stats` |

## 已知取舍

- **需自托管 + 暴露 HTTPS**:本机 `127.0.0.1:1279` 仅本机可达,小程序打不过去。
- **IP 限速 10r/s**:个人/小团队够;多人高并发要解开 compose 的 `RATE_LIMIT` 调高。
- **content 是逐句数组**:`miniapp/utils/api.js` 已统一 join 成换行文本给 UI。
- **飞花令只在 REST**:`char` 参数 GraphQL 的 `randomPoem` 不支持,小程序走 REST。

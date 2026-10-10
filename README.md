# daily-poetry(每天吟诗:古诗词 API + 微信小程序)

自托管 [chinese-poetry-api](https://github.com/palemoky/chinese-poetry-api)(37 万首 唐诗/宋词/元曲,免 Key)
+ 一个薄微信小程序:今日一诗 / 飞花令 / 全文检索 / 简繁切换。

## 两个工程

仓库根目录分两个文件夹,各管一边:

| 文件夹 | 内容 |
|---|---|
| `backend/` | 后端:`docker-compose.yml` + `.env` + `deploy/`(nginx + Let's Encrypt 脚本) |
| `miniapp/` | 前端:微信小程程序(app.* + pages/ + utils/,原生 wx 无构建) |

```
┌─────────────────────────────────────────────┐
│  后端: chinese-poetry-api (Go+SQLite, 单容器) │
│  - REST: /api/v1/poems/random, /search, ...   │
│  - GraphQL: /graphql                          │
│  - 免 Key, IP 限速 10r/s                      │
└──────────────┬──────────────────────────────┘
               │  HTTPS (公网域, 小程序需加白)
┌──────────────▼──────────────────────────────┐
│  小程序: miniapp/ (原生 wx, 无构建)          │
│  页:  今日一诗 / 飞花令 / 检索 / 设置         │
└─────────────────────────────────────────────┘
```

小程序 `wx.request` 只能打加白的 HTTPS 域,打不了 `127.0.0.1`。所以后端要暴露成公网 HTTPS(见「部署后端」)。

## 部署后端

```bash
cd backend
docker compose up -d              # 起容器, 数据落 ./data (persist)
curl http://127.0.0.1:1279/api/v1/stats   # 37 万首验证
```

镜像 `palemoky/chinese-poetry-api:latest` 支持 amd64/arm64;SQLite 自包含,无需外部 DB。
换端口:改 `.env` 的 `PORT`。

公网 HTTPS 暴露(nginx + Let's Encrypt,本次实际跑通的方案):

```bash
cd backend/deploy
# 1) 先把 Cloudflare 上 poetry.70kj.vip 记录改灰云(DNS-only)
sudo bash install.sh poetry.70kj.vip you@example.com
# 2) 签完证书,把 CF 记录改回橙云(代理),SSL 模式 Full(strict)
curl -sI https://poetry.70kj.vip/api/v1/health   # 期望 200
```

详见 `backend/deploy/README.md`。

## 小程序

```
# 微信开发者工具:导入本目录的 miniapp/ (已带 project.config.json)
# 设置页填: API 地址 = https://poetry.70kj.vip (或你暴露的域)
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

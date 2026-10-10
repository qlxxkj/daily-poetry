# daily-poetry(每天吟诗:古诗词 API + 微信小程序)

自托管 [chinese-poetry-api](https://github.com/palemoky/chinese-poetry-api)(37 万首 唐诗/宋词/元曲,免 Key)
+ 一个薄微信小程序:今日一诗 / 飞花令 / 全文检索 / 简繁切换。

## 两个工程

仓库根目录分两个文件夹,各管一边:

| 文件夹 | 内容 |
|---|---|
| `backend/` | 后端:`docker-compose.yml` + `.env` + `deploy/`(nginx + Let's Encrypt 脚本) |
| `miniapp/` | 前端:微信小程序(app.* + pages/ + utils/,原生 wx 无构建) |

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

**注意**:容器数据挂载相对 compose 所在目录。重排目录后务必从 `backend/` 起,
旧位置的 `data/` 删了会导致容器 503(database connection failed),
删掉旧容器再 `docker compose up -d` 即可。

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
# 微信开发者工具:导入 miniapp/ 目录 (已带 project.config.json)
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

---

# API 说明(原作者项目文档)

## 多语言支持

所有接口支持 `lang` 参数切换简繁体:

| 参数值 | 说明 |
|---|---|
| `zh-Hans` | 简体中文(默认) |
| `zh-Hant` | 繁体中文 |

## REST API

```bash
# 健康检查
curl "http://localhost:1279/api/v1/health"

# 统计信息
curl "http://localhost:1279/api/v1/stats"

# 简体中文(默认)
curl "http://localhost:1279/api/v1/poems"

# 繁体中文
curl "http://localhost:1279/api/v1/poems?lang=zh-Hant"

# 诗词列表(带过滤,与 /poems/random 使用同一组参数)
curl "http://localhost:1279/api/v1/poems?dynasty=唐"
curl "http://localhost:1279/api/v1/poems?author=李白&page=2&page_size=50"
curl "http://localhost:1279/api/v1/poems?dynasty_id=1&type_id=11&type_id=12"  # 多个 type_id 为「或」关系

# 游标翻页:把上一页 pagination.next_cursor 的值回传给 after
curl "http://localhost:1279/api/v1/poems?page_size=50&after=cG9lbTo0MjA"

# 搜索诗词
curl "http://localhost:1279/api/v1/poems/search?q=静夜思"

# 随机诗词
curl "http://localhost:1279/api/v1/poems/random"

# 随机诗词(带过滤)
curl "http://localhost:1279/api/v1/poems/random?author=李白"
curl "http://localhost:1279/api/v1/poems/random?type=五言绝句"
curl "http://localhost:1279/api/v1/poems/random?char=春"  # 飞花令等单字场景
curl "http://localhost:1279/api/v1/poems/random?author=李白&type=五言绝句"
curl "http://localhost:1279/api/v1/poems/random?author=李白&dynasty=唐&type=五言绝句"
curl "http://localhost:1279/api/v1/poems/random?author=李白&dynasty=唐&type=五言绝句&type=七言绝句&type=五言律诗"

# 作者列表
curl "http://localhost:1279/api/v1/authors?page=1&page_size=20"

# 作者详情
curl "http://localhost:1279/api/v1/authors/1"

# 朝代列表
curl "http://localhost:1279/api/v1/dynasties"

# 朝代详情
curl "http://localhost:1279/api/v1/dynasties/1"

# 诗词体裁列表
curl "http://localhost:1279/api/v1/types"

# 诗词体裁详情
curl "http://localhost:1279/api/v1/types/10"
```

## GraphQL API

端点:`http://localhost:1279/graphql`

```graphql
# 繁体中文查询
query {
  poems(lang: ZH_HANT, pageSize: 10) {
    edges {
      node {
        title
        content
        author {
          name
        }
      }
    }
    totalCount
  }
}

# 搜索诗词
query {
  searchPoems(query: "静夜思", searchType: TITLE) {
    edges {
      node {
        title
        author {
          name
        }
      }
    }
  }
}

# 统计信息
query {
  statistics {
    totalPoems
    totalAuthors
    poemsByDynasty {
      dynasty {
        name
      }
      count
    }
  }
}
```

## 搜索功能

| 类型 | 说明 | 示例 |
|---|---|---|
| `all` | 全文搜索(默认) | `?q=月` |
| `title` | 标题搜索 | `?q=静夜思&type=title` |
| `content` | 内容搜索 | `?q=床前明月光&type=content` |
| `author` | 作者搜索 | `?q=李白&type=author` |

## 数据集

本项目基于 chinese-poetry 数据集,使用的是修正了错字、朝代与作者等问题的
[palemoky/chinese-poetry](https://github.com/palemoky/chinese-poetry)(fix-typo 分支),包含:

| 分类 | 数量 | 分类 | 数量 | 分类 | 数量 | 分类 | 数量 |
|---|---|---|---|---|---|---|---|
| 五言绝句 | 16,860 | 七言绝句 | 82,744 | 五言律诗 | 59,681 | 七言律诗 | 68,696 |
| 乐府诗 | 6,714 | 五代词 | 543 | 宋词 | 21,347 | 元曲 | 10,904 |
| 诗经 | 305 | 楚辞 | 65 | 论语 | 20 | 四书五经 | 14 | 其他 | 76,077 |

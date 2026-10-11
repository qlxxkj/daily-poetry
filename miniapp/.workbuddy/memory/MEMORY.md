# 一诗一令 · 项目长期笔记

## 项目定位

微信小程序（appid `wx1da86453c1691c10`），薄客户端：只做展示 + 轻交互，
诗词库（约 37 万首）与检索/飞花令/随机全部在自建 API 上。
API 基址写死在 `config.js`：`https://poetry.70kj.vip`（**不在界面上暴露**）。

页面：
- tabBar 三项：`today`(今日一诗) / `fh`(飞花令) / `mine`(我的)
- 二级页：`query`(查询，从导航栏放大镜图标进) / `poem`(详情) / `favorites`(收藏)
- 术语统一用「查询」，不要写「检索」

## 架构约定

- **自定义导航栏**：`app.json` 里 `navigationStyle: custom`，组件 `components/navbar`
  （只有标题模式；自带一套 token，因为样式隔离下页面的 `.t-dark` 够不到组件内部）
  - **标题必须绝对定位 + 左右内缩量相等**，居中量 = `胶囊宽 + (有查询按钮 ? 按钮槽位 : 0)`，
    由 navbar.js 算好传 `left/right`。用 flex 居中会被右侧的 `padding-right: capsuleRight`
    推左约 48px
  - 标题须 `pointer-events: none`，`.nb__btn` 须 `z-index: 1`，否则标题吃掉按钮点击
  - 输入框不要放导航栏（右侧要给胶囊让位，宽度不划算），一律放内容区顶部（见 `pages/query` 的 `.field`）
- **自定义 tabBar**：`app.json` 里 `tabBar.custom: true` → `custom-tab-bar/`。
  用它的唯一理由是原生 tabBar 颜色写死在 app.json，切深色会留一条白底。
  每个 tab 页在 `onShow` 里 `this.getTabBar().setData({selected, theme})` 同步。
- **主题**：`darkmode: true` + `themeLocation: theme.json`（微信要求两者配套）。
  但渲染不靠官方机制 —— 官方那套只能跟随系统，做不了手动覆盖。
  实际做法：`utils/theme.js` 解析 light|dark → 页面 `data.theme` → 根节点挂 `.t-dark`
  → CSS 变量整体替换。另需 `wx.setBackgroundColor` / `wx.setNavigationBarColor`
  刷 page 元素与状态栏（CSS 够不到）。
- **传参**：详情页短诗走 URL `?p=`（保搜一搜抓取），长诗走 `globalData.pendingPoem`，
  统一入口 `utils/nav.js` 的 `gotoPoem()`
- **多语言（i18n）**：`utils/i18n.js`，订阅-广播模型（与 theme.js 同构）。
  词典 `DICT` 含 zh-Hans / zh-Hant 两套**全量 UI 文案**（tabBar/导航栏/按钮/标签/
  模态框/toast/分享标题/API 报错）。页面模式：`onShow` 里 `i18n.sync(this)` 写
  `data.T`（wxml 用 `{{T.key}}`）+ `onChange(fn)` 注册监听，`onHide/onUnload` 注销；
  `onLangChange` 里换文案 + 按新语言重拉诗。组件用 `i18n.fallback()` 防 getApp 未就绪；
  share-sheet 不引 i18n，走 `t` 属性由宿主页传词典。  语言切换唯一入口：「我的」页
  `pickLang` → `i18n.setLang`（首页切换器已删）。诗词正文由 API 按 lang 返回，与 UI 解耦
- **`<button>` 布局坑**：微信 button 内置 `display:flex; justify-content:center`，
  类选择器盖不住它，在 button 上写 `flex + space-between` 真机不生效（内容居中）。
  要承载复杂布局（两端对齐等）时：布局交给外层 view，button 退化为「满宽透明触发区」
  （flex:1 / width:100% / padding:0 / background:transparent / border-radius:0），
  靠 `open-type` 或 bindtap 触发。见 `pages/mine` 的 `.row__share`/`.row__share-btn`
- **本地数据**：收藏（`utils/fav.js`，键 `poetry_favorites`，主键 `title|author`）、
  昵称头像、语言、主题，全在 wx storage，不上传不登录
- 预览产物放 `.workbuddy/design-preview/`，已在 `packOptions.ignore` 排除
- 工具脚本放 `.workbuddy/tools/`：`gen_icons.py`（图标+头像）、`palette.py`（配色与 WCAG 校验）、
  `check.py`（静态校验）、`preview.py`（渲染预览 HTML + 截图）
- `@import` 一律用相对路径

## 设计系统（`app.wxss`）

**方向**：现代极简。墨色做骨架，朱砂做强调，其余留给留白，支持浅/深双主题。

### 色彩（浅色 / 深色）

| token | 浅色 | 深色 | 用途 |
|---|---|---|---|
| `--bg` | `#F9F6F5` | `#141110` | 页面底 |
| `--card` | `#FEFCFC` | `#211D1C` | 卡片 |
| `--fill` / `--fill-2` | `#F6F0EF` / `#EFE8E5` | `#302B2A` / `#3E3836` | 次级填充 / 按下态 |
| `--line` | `#EAE5E3` | `#373230` | 分割线 |
| `--ink` / `--ink-2` / `--ink-3` | `#241D1B` / `#645B59` / `#766D6A` | `#F2EBE9` / `#C9C0BE` / `#B2AAA8` | 主 / 次 / 辅助 |
| `--accent` / `--accent-bg` | `#A5492B` / `#FDEEE9` | `#E78F73` / `#3D2821` | 朱砂 |
| `--on-solid` | `#FDF9F8` | `#181210` | 实底上的文字 |

规则（改动时守住）：
- 不用纯白 `#fff` / 纯黑 `#000`
- 中性色统一带暖调（OKLCH hue 40），不要无色彩的灰
- 所有文字 ≥ 4.5:1（含**占位文字**；原 `#9AA1AC` 只有 2.6:1，已废弃）
- 强调色在深底上必须提亮，直接沿用浅色朱砂会掉到 2:1
- 选值走 OKLCH 感知均匀空间，落地一律 hex（小程序 WebView 对 `oklch()` 支持不稳）

### 字阶 / 间距 / 动效

- 字阶：`--t-cap 24` `--t-sm 28` `--t-body 32` `--t-poem 36` `--t-title 44` `--t-display 52`（rpx）
- 间距 8rpx 网格 `--s-1`…`--s-7` = 8/16/24/32/40/56/72；圆角 `--r-sm/md/lg` = 12/18/28
- 动效 `--dur-1/2/3` = 120/240/420ms，缓动 `--ease: cubic-bezier(0.25,1,0.5,1)`
- 只动 `transform`/`opacity`，不用回弹；已加 `prefers-reduced-motion` 兜底
- 字体：UI 系统无衬线；诗词正文/标题用 `.serif`（Songti SC / SimSun）

### 公共类

`.page(--tab)` `.card` `.btn(--ghost/--block)` `.tag(--accent)` `.chip(--on)`
`.poem*` `.actbar/.act` `.cta(__main/__side)` `.row*` `.group` `.hero(--lead/--center)`
`.state*` `.notice*` `.err-box` `.section-title` `.hr` `.serif` `.rise/.rise-item`

## 图标

- tabBar：`assets/tabbar/{today,fh,mine}[-active][-dark].png`，81×81 PNG；
  灰 `#766D6A` / 朱砂 `#A5492B`（浅色），`#B2AAA8` / `#E78F73`（深色）
- 页面内：`styles/icons.wxss`，18 个内联 SVG base64；色变体 `-acc/-w/-ok/-err/-ink/-line`
- 头像：`assets/avatar-default[-dark].png`，240×240
- 页面内图标**不能**用本地相对路径（WXSS 限制），只能 base64 或网络图
- 生成脚本：无 Pillow，手写 PNG 编码器 + SDF 光栅化（见 2026-10-10 日志）
- **坑**：`raster()` 里 1 像素 = 设计坐标 1 单位，图形定义在 81×81 空间；
  画到别的尺寸画布必须先按比例缩放，否则图形缩在左上角

## 「今日一诗」逻辑

- 缓存按语言分键 `poetry_today_${lang}`，日期用**本地时间**拼（不能用 `toISOString`，会跨天错乱）
- 只有自动抽的那首写缓存；手动「再抽一首」不写，否则随手一抽就把今日那首顶掉
- `onShow` 判断顺序：本次会话已有诗且语言没变 → 不动；再查当天缓存；最后才请求

// 古诗词 API 基址,写死在这里。
// 微信小程序 wx.request 只能打加白的 HTTPS 域(小程序后台 → 开发设置 →
// 服务器域名 → request 合法域名,须含 poetry.70kj.vip)。
// 换环境(比如内测/生产)只改这一个文件。
const API_BASE = "https://poetry.70kj.vip";

module.exports = { API_BASE };

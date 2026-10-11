// 古诗词 API 基址,写死在这里。换环境(内测/生产)只改这一个文件。
//
// 【上线必做】微信小程序 wx.request 只认白名单域名,不加会报
// "url not in domain list":
//   mp.weixin.qq.com → 管理 → 开发管理 → 开发设置 → 服务器域名
//   → request 合法域名 → 加 https://poetry.70kj.vip
//   注意:域名要备案,且必须是 HTTPS;一个月只能改 5 次。
//
// 【本地调试】没配白名单时,开发者工具「详情 → 本地设置」勾上
//   「不校验合法域名、web-view、TLS 版本以及 HTTPS 证书」即可跑通
//   (已写进 project.private.config.json 的 setting.urlCheck = false)。
//   真机预览也需要在真机调试面板打开同一开关。
const API_BASE = "https://poetry.70kj.vip";

module.exports = { API_BASE };

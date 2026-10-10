// 每天吟诗 — 薄客户端:读手机本机古诗词 API。
// 重活(诗词库 37 万首 + 检索/飞花令/随机)全在 self-host 的 chinese-poetry-api,
// 小程序只做展示 + 轻交互。API 基址存本地设置,默认占位,需配成 HTTPS 域。
App({
    globalData: {
        apiBase: "", // 如 https://poetry.<你的域>.cf  (1279 服务通过 CF Tunnel 暴露的 HTTPS 域)
        lang: "zh-Hans", // zh-Hans 简体 / zh-Hant 繁体
    },
    onLaunch() {
        this.globalData.apiBase =
            wx.getStorageSync("poetry_api_base") || "";
        this.globalData.lang =
            wx.getStorageSync("poetry_lang") || "zh-Hans";
    },
});

// 每天吟诗 — 薄客户端:读手机本机古诗词 API。
// 重活(诗词库 37 万首 + 检索/飞花令/随机)全在 self-host 的 chinese-poetry-api,
// 小程序只做展示 + 轻交互。API 基址写死在 config.js,不需要用户在设置里填。
const { API_BASE } = require("./config.js");
App({
    globalData: {
        apiBase: API_BASE,
        lang: "zh-Hans", // zh-Hans 简体 / zh-Hant 繁体
    },
    onLaunch() {
        this.globalData.lang =
            wx.getStorageSync("poetry_lang") || "zh-Hans";
    },
});

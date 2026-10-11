// 每天吟诗 — 薄客户端:读手机本机古诗词 API。
// 重活(诗词库 37 万首 + 查询/飞花令/随机)全在 self-host 的 chinese-poetry-api,
// 小程序只做展示 + 轻交互。API 基址写死在 config.js,不暴露给用户。
const { API_BASE } = require("./config.js");
const theme = require("./utils/theme.js");

// 自定义导航栏的尺寸:状态栏高度由系统给,导航栏高度由「胶囊」反推 ——
// 胶囊是微信画的,挪不走,所以右侧必须给它留出空间。
function measureNav() {
    const w = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const statusH = (w && w.statusBarHeight) || 20;
    let barH = 44;
    let capsuleRight = 96;
    try {
        const m = wx.getMenuButtonBoundingClientRect();
        if (m && m.height) {
            barH = Math.round((m.top - statusH) * 2 + m.height);
            capsuleRight = Math.max(0, Math.round((w && w.windowWidth || 375) - m.left));
        }
    } catch (e) {
        /* 拿不到胶囊就按默认值兜底 */
    }
    return { statusH, barH, totalH: statusH + barH, capsuleRight };
}

App({
    globalData: {
        apiBase: API_BASE,
        lang: "zh-Hans", // zh-Hans 简体 / zh-Hant 繁体
        theme: "light", // light / dark,由 utils/theme.js 解析
        nav: { statusH: 20, barH: 44, totalH: 64, capsuleRight: 96 },
        pendingPoem: null, // 列表页 → 详情页传整首诗(URL query 有长度限制,长诗会被截断)
    },

    onLaunch() {
        this.globalData.lang = wx.getStorageSync("poetry_lang") || "zh-Hans";
        this.globalData.nav = measureNav();
        this.globalData.theme = theme.current();
        theme.paintChrome(this.globalData.theme);
    },
});

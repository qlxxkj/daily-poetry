// 分享：给好友（onShareAppMessage）与分享到朋友圈（onShareTimeline）。
//
// 两条路的差别：
//   好友 —— 走小程序卡片，可以指定 path，所以能精确带到某一首诗；
//   朋友圈 —— 单页模式，只能带 query，且 iOS 至今不开放，只能由用户在
//             右上角「···」里发起；我们能做的是把标题和 query 准备好。
//
// 短诗把整首塞进 query，收到的人直接看到这首；长诗塞不下就退回列表页。
const MAX_QUERY = 1000;
const i18n = require("./i18n.js");

function packPoem(p) {
    try {
        const q = encodeURIComponent(JSON.stringify(p));
        return q.length <= MAX_QUERY ? q : "";
    } catch (e) {
        return "";
    }
}

function title(p) {
    const T = i18n.dict();
    if (!p || !p.title) return `${T.share_brand} · ${T.share_daily}`;
    return `《${p.title}》${p.author ? " " + p.author : ""} · ${T.share_brand}`;
}

// 可读文本，复制与分享封面文案共用
function plain(p) {
    if (!p) return "";
    const head = `《${p.title}》${p.author ? " " + p.author : ""}`;
    return `${head}\n${p.content}\n`;
}

module.exports = {
    MAX_QUERY,
    packPoem,
    plain,

    // 页面 onShareAppMessage() 直接返回它
    appMessage(p, fallbackPath) {
        const fallback = fallbackPath || "/pages/today/today";
        const q = p && p.title ? packPoem(p) : "";
        return { title: title(p), path: q ? `/pages/poem/poem?p=${q}` : fallback };
    },

    // 页面 onShareTimeline() 直接返回它。query 不带前导 ?
    timeline(p, fallbackQuery) {
        const fb = fallbackQuery || "";
        const q = p && p.title ? packPoem(p) : "";
        return q ? { title: title(p), query: `p=${q}` } : { title: title(p), query: fb };
    },

    copy(p) {
        if (!p) return Promise.resolve(false);
        return new Promise((resolve) => {
            wx.setClipboardData({
                data: plain(p),
                success: () => {
                    wx.showToast({ title: i18n.t("toast_copied"), icon: "success" });
                    resolve(true);
                },
                fail: () => resolve(false),
            });
        });
    },
};

// 诗文详情页:由 today/fh/search/favorites 跳转过来,也可能由分享链接直接打开。
// 短诗走 URL 的 p= 参数(便于搜一搜抓取),长诗走 getApp().globalData.pendingPoem
// (见 utils/nav.js),这里两条路都读。
const fav = require("../../utils/fav.js");
const share = require("../../utils/share.js");
const theme = require("../../utils/theme.js");
const i18n = require("../../utils/i18n.js");
// pinyin.json ~139KB，onLoad 时立即同步加载；失败则用空对象兜底（浮层仍出，只是无拼音）
let _PYPIN = {};
function pinyin() {
    if (Object.keys(_PYPIN).length === 0) {
        try { _PYPIN = require("../../utils/pinyin.json"); } catch (e) { console.warn("[pinyin] require failed", e); }
    }
    return _PYPIN;
}

Page({
    data: {
        poem: null,
        error: "",
        theme: "light",
        faved: false,
        sheet: false,
        charPanel: false,
        charPanelChars: [],
        T: {},
    },

    onLoad(opt) {
        pinyin();
        // 优先读全局缓存(不受 URL 长度限制);opt.p 是分享/旧版 query 传参,作兜底
        let p = getApp().globalData.pendingPoem;
        getApp().globalData.pendingPoem = null;
        if (!p && opt && opt.p) {
            try {
                p = JSON.parse(decodeURIComponent(opt.p));
            } catch (e) {
                p = null;
            }
        }
        if (!p || !p.title) {
            this.setData({ error: i18n.t("poem_empty") });
            return;
        }
        this.setData({ poem: p, faved: fav.has(p) });
    },

    onShow() {
        theme.sync(this);
        if (this.data.poem) this.setData({ faved: fav.has(this.data.poem) });
        this.setData({ T: i18n.dict() });
        if (this._langOff) this._langOff();
        this._langOff = i18n.onChange(() => this.onLangChange());
    },

    onHide() {
        if (this._langOff) { this._langOff(); this._langOff = null; }
    },
    onUnload() {
        if (this._langOff) { this._langOff(); this._langOff = null; }
    },

    onLangChange() {
        this.setData({ T: i18n.dict() });
    },

    onBack() {
        wx.navigateBack({
            fail: () => wx.switchTab({ url: "/pages/today/today" }),
        });
    },

    onFav() {
        const p = this.data.poem;
        if (!p) return;
        const added = fav.toggle(p);
        this.setData({ faved: added });
        wx.showToast({ title: added ? i18n.t("toast_faved") : i18n.t("toast_unfav"), icon: added ? "success" : "none" });
    },

    onCopy() {
        return share.copy(this.data.poem);
    },

    openShare() {
        if (!this.data.poem) return;
        this.setData({ sheet: true });
    },
    closeShare() {
        this.setData({ sheet: false });
    },
    onTimelineTip() {
        this.setData({ sheet: false });
        wx.showModal({
            title: i18n.t("modal_moments_title"),
            content: i18n.t("modal_moments_content"),
            showCancel: false,
            confirmText: i18n.t("modal_ok"),
        });
    },

    onShareAppMessage() {
        return share.appMessage(this.data.poem, "/pages/today/today");
    },
    onShareTimeline() {
        return share.timeline(this.data.poem, "");
    },

    // ---------- 长按查字 ----------
    _charTimer: null,
    _charMoved: false,
    onCharPanelTouchStart(e) {
        this._charMoved = false;
        this._charLine = e.currentTarget.dataset.line;
        this._charTimer = setTimeout(() => {
            this._charTimer = null;
            if (this._charMoved) return;
            this._openCharPanel(this._charLine);
        }, 400);
    },
    onCharPanelTouchMove() {
        this._charMoved = true;
        if (this._charTimer) { clearTimeout(this._charTimer); this._charTimer = null; }
    },
    onCharPanelTouchEnd() {
        if (this._charTimer) { clearTimeout(this._charTimer); this._charTimer = null; }
    },
    _openCharPanel(line) {
        const PYPIN = pinyin();
        const chars = [];
        for (const ch of String(line || "")) {
            if (ch >= "一" && ch <= "鿿") chars.push({ ch, py: PYPIN[ch] || "" });
        }
        this.setData({ charPanel: true, charPanelChars: chars });
    },
    closeCharPanel() {
        this.setData({ charPanel: false, charPanelChars: [] });
    },
});

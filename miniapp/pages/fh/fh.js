const { feihualing } = require("../../utils/api.js");
const { gotoPoem } = require("../../utils/nav.js");
const fav = require("../../utils/fav.js");
const share = require("../../utils/share.js");
const theme = require("../../utils/theme.js");
const i18n = require("../../utils/i18n.js");
// pinyin.js ~132KB，onLoad 时立即同步加载；失败则 _PYPIN = {} 兜底（浮层仍出，只是无拼音）
let _PYPIN = {};
function pinyin() {
    if (Object.keys(_PYPIN).length === 0) {
        try { _PYPIN = require("../../utils/pinyin.js"); } catch (e) { console.warn("[pinyin] require failed", e); }
    }
    return _PYPIN;
}

Page({
    data: {
        char: "春",
        poem: null,
        loading: false,
        error: "",
        quick: ["春", "月", "花", "风", "雪", "山", "水", "云"],
        theme: "light",
        faved: false,
        sheet: false,
        charPanel: false,
        charPanelChars: [],
        T: {},
    },

    onLoad() { pinyin(); },

    onShow() {
        // tab 先更新再 sync：即使 theme.sync 出问题，selected 也正确
        const bar = typeof this.getTabBar === "function" ? this.getTabBar() : null;
        if (bar) bar.setData({ selected: 1, theme: theme.current() });
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
        // 当前有诗 → 用新语言重取一首（诗词正文也跟着换语言）
        if (this.data.poem) this.refresh();
    },

    // 与 play 同逻辑，但不清空 poem，避免语言切换瞬间白屏
    refresh() {
        if (this.data.loading) return;
        const c = this.data.char.trim();
        if (!c) return;
        this.setData({ loading: true, error: "" });
        feihualing(c)
            .then((p) => this.setData({ poem: p, loading: false, faved: fav.has(p) }))
            .catch(() => this.setData({ loading: false, error: i18n.t("err_net") }));
    },

    onCharInput(e) {
        this.setData({ char: e.detail.value });
    },

    onQuick(e) {
        this.setData({ char: e.currentTarget.dataset.c });
        this.play();
    },

    async play() {
        if (this.data.loading) return;
        const c = this.data.char.trim();
        if (!c) return;
        this.setData({ loading: true, error: "", poem: null });
        try {
            const p = await feihualing(c);
            this.setData({ poem: p, loading: false, faved: fav.has(p) });
        } catch (e) {
            this.setData({ loading: false, error: i18n.t("err_net") });
        }
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

    goQuery() {
        wx.navigateTo({ url: "/pages/query/query" });
    },

    onDetail() {
        gotoPoem(this.data.poem);
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

    onShareAppMessage() {
        return share.appMessage(this.data.poem, "/pages/fh/fh");
    },
    onShareTimeline() {
        return share.timeline(this.data.poem, `char=${encodeURIComponent(this.data.char || "")}`);
    },
});

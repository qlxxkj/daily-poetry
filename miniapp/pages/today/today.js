const { randomPoem } = require("../../utils/api.js");
const { gotoPoem } = require("../../utils/nav.js");
const fav = require("../../utils/fav.js");
const share = require("../../utils/share.js");
const theme = require("../../utils/theme.js");
const i18n = require("../../utils/i18n.js");

// 按语言分键存:来回切繁简时各自都能复用当天那首,不用反复重抽
function storeKey(lang) {
    return `poetry_today_${lang || "zh-Hans"}`;
}

// 按「本地日期」算天。toISOString() 会转成 UTC,东八区早上 8 点前会被算成前一天,
// 所以这里用本地时间拼,不用 UTC。
function today() {
    const d = new Date();
    const p = (n) => (n < 10 ? "0" + n : "" + n);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const CN_NUM = [
    "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
    "二十一", "二十二", "二十三", "二十四", "二十五", "二十六", "二十七", "二十八", "二十九", "三十", "三十一",
];
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

function dateText() {
    const d = new Date();
    return `${CN_NUM[d.getMonth()]}月${CN_NUM[d.getDate() - 1]}日 星期${WEEK[d.getDay()]}`;
}

Page({
    data: {
        poem: null,
        loading: false,
        error: "",
        lang: "zh-Hans",
        dateText: "",
        theme: "light",
        themePref: "auto",
        faved: false,
        sheet: false,
        T: {},
    },

    onShow() {
        const t = theme.sync(this);
        this.markTab(t);
        const lang = i18n.lang();
        this.setData({ dateText: dateText(), T: i18n.dict() });
        // 注册语言变化监听：从「我的」切语言时，本页要实时换文案
        if (this._langOff) this._langOff();
        this._langOff = i18n.onChange(() => this.onLangChange());

        // 本次会话已经有一首、且语言没变 → 不动它(切 tab 回来、从详情页返回、
        // 手动抽的那首都保留),别打断用户正在看的
        if (this.data.poem && this._poemLang === lang) {
            this.setData({ lang, faved: fav.has(this.data.poem) });
            return;
        }

        // 页面重建 / 首次进入 → 同一天 + 同一语言就复用当天那首
        const cached = wx.getStorageSync(storeKey(lang));
        if (cached && cached.day === today() && cached.poem) {
            this.setData({ poem: cached.poem, lang, error: "", faved: fav.has(cached.poem) });
            this._poemLang = lang;
            return;
        }

        this.setData({ lang });
        this.pick(true);
    },

    onHide() {
        if (this._langOff) { this._langOff(); this._langOff = null; }
    },
    onUnload() {
        if (this._langOff) { this._langOff(); this._langOff = null; }
    },

    // 语言切换：重写 T 并重新抽当前语言的那首（诗词正文也跟着换语言）
    onLangChange() {
        const lang = i18n.lang();
        this.setData({ T: i18n.dict(), lang, error: "" });
        this._poemLang = null;
        this.pick(true);
    },

    // auto=true 表示这就是「今日这首」,结果写进当天缓存;
    // 手动「再抽一首」不写,否则随手一抽就把今日那首顶掉了。
    async pick(auto) {
        if (this.data.loading) return;
        this.setData({ loading: true, error: "" });
        try {
            const p = await randomPoem();
            this.setData({ poem: p, loading: false, faved: fav.has(p) });
            this._poemLang = this.data.lang;
            if (auto === true) this.saveToday(p);
        } catch (e) {
            this.setData({ loading: false, poem: null, error: e.message || i18n.t("err_load") });
        }
    },

    onPickMore() {
        this.pick(false);
    },

    saveToday(p) {
        wx.setStorageSync(storeKey(this.data.lang), { day: today(), poem: p });
    },

    markTab(t) {
        const bar = typeof this.getTabBar === "function" ? this.getTabBar() : null;
        if (bar) bar.setData({ selected: 0, theme: t });
    },

    // ---------- 操作 ----------
    onFav() {
        const p = this.data.poem;
        if (!p) return;
        const added = fav.toggle(p);
        this.setData({ faved: added });
        wx.showToast({ title: added ? "已收藏" : "已取消收藏", icon: added ? "success" : "none" });
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
            title: "分享到朋友圈",
            content: "请点击右上角「···」，选择「分享到朋友圈」。\n（微信目前仅 Android 支持）",
            showCancel: false,
            confirmText: "知道了",
        });
    },

    goQuery() {
        wx.navigateTo({ url: "/pages/query/query" });
    },

    onDetail() {
        gotoPoem(this.data.poem);
    },

    // ---------- 分享 ----------
    onShareAppMessage() {
        return share.appMessage(this.data.poem, "/pages/today/today");
    },
    onShareTimeline() {
        return share.timeline(this.data.poem, "");
    },
});

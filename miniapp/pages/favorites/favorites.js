const { gotoPoem } = require("../../utils/nav.js");
const fav = require("../../utils/fav.js");
const share = require("../../utils/share.js");
const theme = require("../../utils/theme.js");
const i18n = require("../../utils/i18n.js");

Page({
    data: {
        list: [],
        theme: "light",
        T: {},
    },

    onShow() {
        theme.sync(this);
        this.setData({ list: fav.list(), T: i18n.dict() });
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

    onUnfav(e) {
        const i = e.currentTarget.dataset.index;
        const p = this.data.list[i];
        if (!p) return;
        this.setData({ list: fav.remove(p) });
        wx.showToast({ title: i18n.t("toast_unfav"), icon: "none" });
    },

    onCopy(e) {
        const p = this.data.list[e.currentTarget.dataset.index];
        return p && share.copy(p);
    },

    onDetail(e) {
        gotoPoem(this.data.list[e.currentTarget.dataset.index]);
    },

    goToday() {
        wx.switchTab({ url: "/pages/today/today" });
    },

    onShareAppMessage() {
        const T = i18n.dict();
        return {
            title: `${T.share_brand} · ${T.share_fav_tag}`,
            path: "/pages/today/today",
        };
    },
    onShareTimeline() {
        const T = i18n.dict();
        return { title: T.share_brand, query: "" };
    },
});

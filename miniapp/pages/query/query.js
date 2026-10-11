const { search } = require("../../utils/api.js");
const { gotoPoem } = require("../../utils/nav.js");
const fav = require("../../utils/fav.js");
const share = require("../../utils/share.js");
const theme = require("../../utils/theme.js");
const i18n = require("../../utils/i18n.js");

const HOT = ["春", "月", "花", "李白", "杜甫", "唐", "山水", "思乡"];

Page({
    data: {
        q: "",
        results: [],
        loading: false,
        error: "",
        searched: false,   // 区分「还没搜」和「搜了没结果」两种空态
        hot: HOT,
        theme: "light",
        T: {},
    },

    onLoad(opt) {
        // 分享进来时带 q=，直接开搜
        if (opt && opt.q) {
            this.setData({ q: decodeURIComponent(opt.q) });
            this.doSearch();
        }
    },

    onShow() {
        theme.sync(this);
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

    onInput(e) {
        this.setData({ q: e.detail.value });
    },

    onClear() {
        this.setData({ q: "", results: [], error: "", searched: false });
    },

    onHot(e) {
        this.setData({ q: e.currentTarget.dataset.q });
        this.doSearch();
    },

    async doSearch() {
        const q = this.data.q.trim();
        if (!q) return;
        this.setData({ loading: true, error: "" });
        try {
            const list = await search(q, "all");
            // faved 逐条算好，收藏按钮才能在列表里直接反映状态
            this.setData({
                results: list.map((p) => Object.assign({ faved: fav.has(p) }, p)),
                searched: true,
                loading: false,
            });
        } catch (e) {
            this.setData({ loading: false, searched: true, error: e.message || i18n.t("query_fail") });
        }
    },

    onFav(e) {
        const i = e.currentTarget.dataset.index;
        const p = this.data.results[i];
        if (!p) return;
        const added = fav.toggle(p);
        this.setData({ [`results[${i}].faved`]: added });
        wx.showToast({ title: added ? i18n.t("toast_faved") : i18n.t("toast_unfav"), icon: added ? "success" : "none" });
    },

    onCopy(e) {
        const p = this.data.results[e.currentTarget.dataset.index];
        return p && share.copy(p);
    },

    onDetail(e) {
        gotoPoem(this.data.results[e.currentTarget.dataset.index]);
    },

    onShareAppMessage() {
        const q = this.data.q.trim();
        const T = i18n.dict();
        return {
            title: q ? `${T.share_q_prefix}${q}${T.share_q_suffix}` : `${T.share_brand} · ${T.share_query_tag}`,
            path: q ? `/pages/query/query?q=${encodeURIComponent(q)}` : "/pages/query/query",
        };
    },

    onShareTimeline() {
        const q = this.data.q.trim();
        const T = i18n.dict();
        return {
            title: q ? `${T.share_q_prefix}${q}${T.share_q_suffix}` : `${T.share_brand} · ${T.share_query_tag}`,
            query: q ? `q=${encodeURIComponent(q)}` : "",
        };
    },
});

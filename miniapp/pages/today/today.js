const { randomPoem } = require("../../utils/api.js");

Page({
    data: {
        poem: null,
        loading: false,
        error: "",
        lang: "zh-Hans",
    },
    onShow() {
        this.setData({ lang: getApp().globalData.lang || "zh-Hans" });
        this.pick();
    },
    async pick() {
        if (this.data.loading) return;
        this.setData({ loading: true, error: "" });
        try {
            const p = await randomPoem();
            this.setData({ poem: p, loading: false });
            this.saveToday(p);
        } catch (e) {
            this.setData({ loading: false, error: e.message || "加载失败" });
        }
    },
    // 每日一句:同一天重复进首页不再换,留昨天那份
    saveToday(p) {
        const day = new Date().toISOString().slice(0, 10);
        const stored = wx.getStorageSync("poetry_today");
        if (stored && stored.day === day && stored.id === p.id) return;
        wx.setStorageSync("poetry_today", { day, id: p.id });
    },
    onShare() {
        const p = this.data.poem;
        if (!p) return;
        wx.setClipboardData({
            data: `《${p.title}》 ${p.author}\n${p.content}\n`,
            success: () => wx.showToast({ title: "已复制", icon: "success" }),
        });
    },
    // 诗文详情:跳 poem 页,带上整首诗
    onDetail() {
        const p = this.data.poem;
        if (!p) return;
        const q = encodeURIComponent(JSON.stringify(p));
        wx.navigateTo({ url: `/pages/poem/poem?p=${q}` });
    },
    toggleLang() {
        const next = this.data.lang === "zh-Hans" ? "zh-Hant" : "zh-Hans";
        getApp().globalData.lang = next;
        wx.setStorageSync("poetry_lang", next);
        this.setData({ lang: next, poem: null, error: "" });
        this.pick();
    },
});

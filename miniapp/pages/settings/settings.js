const { stats } = require("../../utils/api.js");

Page({
    data: {
        apiBase: "",
        lang: "zh-Hans",
        testing: false,
        testResult: "",
    },
    onShow() {
        this.setData({
            apiBase: wx.getStorageSync("poetry_api_base") || "",
            lang: getApp().globalData.lang || "zh-Hans",
        });
    },
    onBase(e) { this.setData({ apiBase: e.detail.value }); },
    setLang(e) {
        const l = e.currentTarget.dataset.lang;
        getApp().globalData.lang = l;
        wx.setStorageSync("poetry_lang", l);
        this.setData({ lang: l });
    },
    save() {
        wx.setStorageSync("poetry_api_base", this.data.apiBase.trim());
        getApp().globalData.apiBase = this.data.apiBase.trim();
        wx.showToast({ title: "已保存", icon: "success" });
    },
    async test() {
        wx.setStorageSync("poetry_api_base", this.data.apiBase.trim());
        getApp().globalData.apiBase = this.data.apiBase.trim();
        this.setData({ testing: true, testResult: "" });
        try {
            const s = await stats();
            this.setData({
                testing: false,
                testResult: `连接成功 · ${s.total_poems} 首诗 / ${s.total_authors} 位诗人`,
            });
        } catch (e) {
            this.setData({ testing: false, testResult: "连接失败:" + e.message });
        }
    },
});

const { stats } = require("../../utils/api.js");
const { API_BASE } = require("../../config.js");

Page({
    data: {
        apiBase: API_BASE,
        lang: "zh-Hans",
        testing: false,
        testResult: "",
    },
    onShow() {
        this.setData({
            apiBase: API_BASE,
            lang: getApp().globalData.lang || "zh-Hans",
        });
    },
    setLang(e) {
        const l = e.currentTarget.dataset.lang;
        getApp().globalData.lang = l;
        wx.setStorageSync("poetry_lang", l);
        this.setData({ lang: l });
    },
    async test() {
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

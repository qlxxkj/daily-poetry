const { search, stats } = require("../../utils/api.js");

Page({
    data: {
        q: "",
        results: [],
        loading: false,
        error: "",
        total: 0,
    },
    onInput(e) { this.setData({ q: e.detail.value }); },
    async doSearch() {
        const q = this.data.q.trim();
        if (!q) return;
        this.setData({ loading: true, error: "" });
        try {
            const list = await search(q, "all");
            this.setData({ results: list, total: list.length, loading: false });
        } catch (e) {
            this.setData({ loading: false, error: e.message || "检索失败" });
        }
    },
    onCopy(e) {
        const p = e.currentTarget.dataset.poem;
        wx.setClipboardData({
            data: `《${p.title}》 ${p.author}\n${p.content}\n`,
            success: () => wx.showToast({ title: "已复制", icon: "success" }),
        });
    },
});

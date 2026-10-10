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
            // 检索有结果时,标题展示榜首诗文供微信搜一搜抓
            if (list.length) {
                wx.setNavigationBarTitle({
                    title: `${list[0].title} · ${list[0].author} | 一诗一令古诗词`,
                });
            } else {
                wx.setNavigationBarTitle({
                    title: `一诗一令古诗词 - 古诗词检索「${q}」`,
                });
            }
        } catch (e) {
            this.setData({ loading: false, error: e.message || "检索失败" });
            wx.setNavigationBarTitle({
                title: "一诗一令古诗词 - 古诗词标题作者全文检索",
            });
        }
    },
    onCopy(e) {
        const p = e.currentTarget.dataset.poem;
        wx.setClipboardData({
            data: `《${p.title}》 ${p.author}\n${p.content}\n`,
            success: () => wx.showToast({ title: "已复制", icon: "success" }),
        });
    },
    // 诗文详情:跳 poem 页,带上整首诗
    onDetail(e) {
        const p = e.currentTarget.dataset.poem;
        if (!p) return;
        const q = encodeURIComponent(JSON.stringify(p));
        wx.navigateTo({ url: `/pages/poem/poem?p=${q}` });
    },
});

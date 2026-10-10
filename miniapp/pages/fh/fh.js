const { feihualing } = require("../../utils/api.js");

Page({
    data: {
        char: "春",
        poem: null,
        loading: false,
        error: "",
        quick: ["春", "月", "花", "风", "雪", "山", "水", "云"],
    },
    onCharInput(e) { this.setData({ char: e.detail.value }); },
    onQuick(e) { this.setData({ char: e.currentTarget.dataset.c }); this.play(); },
    async play() {
        const c = this.data.char.trim();
        if (!c) return;
        this.setData({ loading: true, error: "", poem: null });
        try {
            const p = await feihualing(c);
            this.setData({ poem: p, loading: false });
            // 诗文详情: 动态标题供微信搜一搜抓
            wx.setNavigationBarTitle({
                title: `${p.title} · ${p.author} | 一诗一令`,
            });
        } catch (e) {
            this.setData({ loading: false, error: e.message || "飞花令失败" });
            wx.setNavigationBarTitle({
                title: "一诗一令 - 飞花令抽字觅诗",
            });
        }
    },
    onCopy() {
        const p = this.data.poem;
        if (!p) return;
        wx.setClipboardData({
            data: `《${p.title}》 ${p.author}\n${p.content}\n`,
            success: () => wx.showToast({ title: "已复制", icon: "success" }),
        });
    },
    // 诗文详情:跳 poem 页,带上整首诗(query 有长度限制,诗短无碍)
    onDetail() {
        const p = this.data.poem;
        if (!p) return;
        const q = encodeURIComponent(JSON.stringify(p));
        wx.navigateTo({ url: `/pages/poem/poem?p=${q}` });
    },
});

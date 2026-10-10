// 诗文详情页:由 today/fh/search 携带整首诗跳转过来(小程序 query 有长度限制,
// 诗文短无碍)。onLoad 里设动态标题「<诗词名> · <作者> | 一诗一令」供搜一搜抓。
Page({
    data: {
        poem: null,
        error: "",
    },
    onLoad(opt) {
        let p = null;
        try {
            p = JSON.parse(decodeURIComponent(opt.p));
        } catch (e) {
            /* 无参兜底 */
        }
        if (!p || !p.title) {
            this.setData({ error: "未找到诗文" });
            return;
        }
        this.setData({ poem: p });
        wx.setNavigationBarTitle({
            title: `${p.title} · ${p.author} | 一诗一令`,
        });
    },
    onCopy() {
        const p = this.data.poem;
        if (!p) return;
        wx.setClipboardData({
            data: `《${p.title}》 ${p.author}\n${p.content}\n`,
            success: () => wx.showToast({ title: "已复制", icon: "success" }),
        });
    },
});

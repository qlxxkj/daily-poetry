// 自定义 tabBar。
// 用它的唯一理由：原生 tabBar 的颜色写死在 app.json 里，切到深色主题时
// 它会留着一条白底，跟页面割裂。自己画才能跟着主题走。
const i18n = require("../utils/i18n.js");

const TABS = [
    { key: "today", path: "/pages/today/today", tkey: "tab_today" },
    { key: "fh", path: "/pages/fh/fh", tkey: "tab_fh" },
    { key: "mine", path: "/pages/mine/mine", tkey: "tab_mine" },
];

// 默认（简体）文案，作为 data 初值；getApp 就绪后由 localize() 校正
function withText() {
    return TABS.map((t) => Object.assign({}, t, { text: i18n.fallback(t.tkey) }));
}

Component({
    data: {
        list: withText(),
        selected: 0,
        theme: "light",
    },

    lifetimes: {
        attached() {
            this.localize();
            // 语言切换时实时刷新三个 tab 文字
            this._off = i18n.onChange(() => this.localize());
        },
        detached() {
            if (this._off) this._off();
        },
    },

    methods: {
        localize() {
            this.setData({ list: TABS.map((t) => Object.assign({}, t, { text: i18n.t(t.tkey) })) });
        },
        onTap(e) {
            const d = e.currentTarget.dataset;
            if (d.index === this.data.selected) return;
            wx.switchTab({ url: d.path });
        },
    },
});

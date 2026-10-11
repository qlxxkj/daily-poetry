// 自定义导航栏。
// 之所以自己画：原生导航栏右侧被微信胶囊占死，我们连一个查询入口都放不进去。
const NAV_DEFAULT = { statusH: 20, barH: 44, totalH: 64, capsuleRight: 96 };

// 右侧查询按钮的槽位宽（72rpx），换算成 px 后才能和胶囊的 px 值相加
function slotPx() {
    try {
        const w = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        return Math.ceil((72 * ((w && w.windowWidth) || 375)) / 750);
    } catch (e) {
        return 36;
    }
}

Component({
    properties: {
        title: { type: String, value: "" },
        theme: { type: String, value: "light" },
        back: { type: Boolean, value: false },
        // 右侧查询入口，点了跳查询页
        search: { type: Boolean, value: false },
        border: { type: Boolean, value: false },
    },

    data: Object.assign({ titleInset: 96 }, NAV_DEFAULT),

    // 标题要落在屏幕正中，就必须让左右内缩量相等；
    // 而右侧要避开胶囊（+ 查询按钮），左侧就得留同样宽 —— 否则又会被推偏。
    observers: {
        "search, capsuleRight": function (search, capsuleRight) {
            const cap = capsuleRight || NAV_DEFAULT.capsuleRight;
            this.setData({ titleInset: cap + (search ? slotPx() : 0) });
        },
    },

    lifetimes: {
        attached() {
            // 这里再算一次 titleInset，不依赖 observers 的初始触发时机
            const app = getApp();
            const nav = (app && app.globalData && app.globalData.nav) || null;
            const cap = (nav && nav.capsuleRight) || NAV_DEFAULT.capsuleRight;
            this.setData(Object.assign({}, nav || {}, {
                titleInset: cap + (this.data.search ? slotPx() : 0),
            }));
        },
    },

    methods: {
        onBack() {
            this.triggerEvent("back");
        },
        onSearch() {
            this.triggerEvent("search");
        },
    },
});

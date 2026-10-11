// 分享面板。
// 微信好友：用 <button open-type="share"> 直接唤起，分享内容由宿主页面的
//           onShareAppMessage 决定。
// 朋友圈：微信没有开放「代码里直接拉起分享到朋友圈」，只能由用户在右上角
//         「···」里发起（且 iOS 至今不支持），所以这里点下去是引导。
//         我们能提前做好的，是把 onShareTimeline 的标题和 query 备齐。
Component({
    properties: {
        show: { type: Boolean, value: false },
        theme: { type: String, value: "light" },
        title: { type: String, value: "" },
        sub: { type: String, value: "" },
        // 由宿主页传入当前语言词典，分享面板的按钮文案随之切换简繁
        t: { type: Object, value: {} },
    },

    methods: {
        onClose() {
            this.triggerEvent("close");
        },
        onTimeline() {
            this.triggerEvent("timeline");
        },
        onCopy() {
            this.triggerEvent("copy");
        },
    },
});

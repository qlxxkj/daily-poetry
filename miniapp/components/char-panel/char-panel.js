// 长按某行诗词时，从底部升起浮层，逐字显示拼音。
// 拼音由宿主页查 utils/pinyin.json 后以 chars 数组传入，组件纯展示。
Component({
    properties: {
        show:  { type: Boolean, value: false },
        // chars: [{ ch: "月", py: "yuè" }, { ch: "光", py: "guāng" }]
        chars: { type: Array,  value: [] },
        theme: { type: String, value: "light" },
    },

    methods: {
        onClose() { this.triggerEvent("close"); },
        noop() {},
    },
});

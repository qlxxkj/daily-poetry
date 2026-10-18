// 长按某行诗词时，从底部升起浮层，逐字显示拼音；
// 点某个字后切到详情视图：大字 + 拼音 + 释义（按需调 dict.js 查释义）。
// 拼音直接从宿主页传入的 chars 里取（chars: [{ch, py}]），不额外 require pinyin.json。
const { lookupChar } = require("../../utils/dict.js");

Component({
    properties: {
        show:  { type: Boolean, value: false },
        // chars: [{ ch: "月", py: "yuè" }]
        chars: { type: Array,  value: [] },
        theme: { type: String, value: "light" },
    },

    data: {
        activeChar: null,    // { ch, py, mn } — null = 列表视图
        loadingDetail: false,
    },

    methods: {
        onClose() {
            this.setData({ activeChar: null, loadingDetail: false });
            this.triggerEvent("close");
        },
        noop() {},

        _pyOf(ch) {
            const found = this.data.chars.find(c => c.ch === ch);
            return (found && found.py) || "";
        },

        onCharTap(e) {
            const ch = e.currentTarget.dataset.ch;
            if (this.data.loadingDetail) return;
            this.setData({
                activeChar: { ch, py: this._pyOf(ch), mn: "" },
                loadingDetail: true,
            });
            lookupChar(ch)
                .then(({ py, mn }) => {
                    this.setData({
                        activeChar: { ch, py: py || this._pyOf(ch), mn },
                        loadingDetail: false,
                    });
                })
                .catch(() => this.setData({ loadingDetail: false }));
        },

        onBack() {
            this.setData({ activeChar: null, loadingDetail: false });
        },
    },
});

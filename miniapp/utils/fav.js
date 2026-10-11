// 收藏：全部存在用户手机本地（wx storage），不上传、不依赖登录。
//
// key 设计：服务端 id 不一定有，且同一首诗在不同语言下是两条记录，
// 所以统一用「title|author」当主键，跨简繁切换后仍认得出来。
const KEY = "poetry_favorites";
const MAX = 500;

function key(p) {
    return `${p.title || ""}|${p.author || ""}`;
}

function all() {
    const v = wx.getStorageSync(KEY);
    return Array.isArray(v) ? v : [];
}

function save(list) {
    wx.setStorageSync(KEY, list);
}

function strip(p) {
    return {
        title: p.title || "",
        author: p.author || "",
        dynasty: p.dynasty || "",
        type: p.type || "",
        typeDesc: p.typeDesc || "",
        content: Array.isArray(p.content) ? p.content.join("\n") : String(p.content || ""),
        ts: Date.now(),
    };
}

module.exports = {
    count() {
        return all().length;
    },
    has(p) {
        if (!p) return false;
        const k = key(p);
        return all().some((x) => `${x.title || ""}|${x.author || ""}` === k);
    },
    // 返回 true 表示收藏成功，false 表示已经是收藏的（已取消）
    toggle(p) {
        if (!p || !p.title) return false;
        const list = all();
        const k = key(p);
        const i = list.findIndex((x) => `${x.title || ""}|${x.author || ""}` === k);
        if (i >= 0) {
            list.splice(i, 1);
            save(list);
            return false;
        }
        list.unshift(strip(p));
        save(list.slice(0, MAX));
        return true;
    },
    remove(p) {
        const list = all();
        const k = key(p);
        const next = list.filter((x) => `${x.title || ""}|${x.author || ""}` !== k);
        save(next);
        return next;
    },
    // 给展示用：补上 lines，详情页/列表页直接就能渲染
    list() {
        return all().map((x) => Object.assign({ lines: String(x.content || "").split("\n") }, x));
    },
};

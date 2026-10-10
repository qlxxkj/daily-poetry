// 古诗词 API 薄客户端。REST 为主(随机/检索/飞花令/朝代/统计)。
// 小程序 wx.request 只能打加白的 HTTPS 域;基址在设置页配。
//
// 响应里 content 是「每句一个元素」的数组(如 ["床前明月光","疑是地上霜"]),
// 本模块统一 join 成字符串给 UI。

function base() {
    return (
        getApp().globalData.apiBase ||
        wx.getStorageSync("poetry_api_base") ||
        ""
    ).replace(/\/+$/, "");
}
function lang() {
    return getApp().globalData.lang || wx.getStorageSync("poetry_lang") || "zh-Hans";
}

function http(method, p, body) {
    return new Promise((resolve, reject) => {
        const host = base();
        if (!host) {
            reject(new Error("请先在「设置」里填 API 地址 (HTTPS 域)"));
            return;
        }
        const q = new URLSearchParams();
        if (p.lang !== undefined) q.set("lang", p.lang);
        for (const [k, v] of Object.entries(p)) {
            if (k === "lang") continue;
            if (v === undefined || v === null || v === "") continue;
            q.set(k, v);
        }
        const qs = q.toString();
        const url = `${host}/api/v1${p.path}${qs ? `?${qs}` : ""}`;
        wx.request({
            url,
            method,
            data: body,
            header: { "content-type": "application/json" },
            timeout: 15000,
            success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
                else reject(new Error(`HTTP ${res.statusCode}: ${(res.data && res.data.error) || ""}`.trim()));
            },
            fail: (err) => reject(new Error(err.errMsg || "网络请求失败")),
        });
    });
}

// 规范化诗:content 数组 → 字符串,补全各字段
function normPoem(p) {
    if (!p) return null;
    return {
        id: p.id,
        title: p.title || "",
        content: Array.isArray(p.content) ? p.content.join("\n") : String(p.content || ""),
        author: (p.author && p.author.name) || "",
        dynasty: (p.dynasty && p.dynasty.name) || "",
        type: (p.type && p.type.name) || "",
        typeDesc: (p.type && p.type.description) || "",
        lines: Array.isArray(p.content) ? p.content : null,
    };
}

module.exports = {
    randomPoem(opts) {
        return http("GET", Object.assign({ path: "/poems/random", lang: lang() }, opts || {})).then(normPoem);
    },
    feihualing(char) {
        return http("GET", { path: "/poems/random", char, lang: lang() }).then(normPoem);
    },
    search(q, type) {
        return http("GET", { path: "/poems/search", q, type: type || "all", lang: lang() }).then((d) =>
            (d.data || []).map(normPoem)
        );
    },
    poems(opts) {
        return http("GET", Object.assign({ path: "/poems", lang: lang() }, opts || {})).then((d) => ({
            items: (d.data || d.items || []).map(normPoem),
            total: d.pagination && d.pagination.total,
        }));
    },
    dynasties() {
        return http("GET", { path: "/dynasties" });
    },
    stats() {
        return http("GET", { path: "/stats" });
    },
};

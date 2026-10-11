// 古诗词 API 薄客户端。REST 为主(随机/查询/飞花令/朝代/统计)。
// 小程序 wx.request 只能打加白的 HTTPS 域;基址写死在 config.js,界面上不展示。
//
// 响应里 content 是「每句一个元素」的数组(如 ["床前明月光","疑是地上霜"]),
// 本模块统一 join 成字符串给 UI。

const i18n = require("./i18n.js");

function base() {
    return (getApp().globalData.apiBase || "").replace(/\/+$/, "");
}
function lang() {
    return getApp().globalData.lang || wx.getStorageSync("poetry_lang") || "zh-Hans";
}

// 小程序逻辑层(iOS JSCore / Android V8)不保证有 URLSearchParams,手写拼接更稳。
// 注意:path 是路由,不能混进 query string。
function buildQuery(p) {
    const parts = [];
    for (const k of Object.keys(p)) {
        if (k === "path") continue;
        const v = p[k];
        if (v === undefined || v === null || v === "") continue;
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
    return parts.join("&");
}

function http(method, p, body) {
    return new Promise((resolve, reject) => {
        const host = base();
        if (!host) {
            reject(new Error(i18n.t("err_api")));
            return;
        }
        const qs = buildQuery(p);
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
            fail: (err) => reject(new Error(err.errMsg || i18n.t("err_net"))),
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
        lines: Array.isArray(p.content)
            ? p.content
            : String(p.content || "").split("\n"),
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

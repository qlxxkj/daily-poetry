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

function http(method, p, body, retry) {
    retry = retry === undefined ? 1 : retry; // 默认重试 1 次
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
            timeout: 8000,
            success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
                else reject(new Error(`HTTP ${res.statusCode}: ${(res.data && res.data.error) || ""}`.trim()));
            },
            fail: (err) => {
                // 网络层错误(超时/fail)且还有重试额度 → 等 800ms 重发一次;
                // 否则 reject。业务 4xx/5xx 走 success 分支,不会进这里。
                if (retry > 0 && /fail|timeout/i.test(err.errMsg || "")) {
                    setTimeout(() => http(method, p, body, retry - 1).then(resolve, reject), 800);
                } else {
                    reject(new Error(err.errMsg || i18n.t("err_net")));
                }
            },
        });
    });
}

// 超长的句（元曲散曲 / 古文动辄几十上百字，库里 6.6 万行 >16 字）在卡片里会横向溢出。
// 中文没有空格, CSS 的 word-break/overflow-wrap 都拦不住, 只能在数据层把长句切开。
// 切开点优先选已有的句读（，。、！？；等），没有就硬切（不补标点，保持原文不动）。
function wrapLines(lines) {
    const out = [];
    const cut = 16; // 单行 16 字 + 字距 3rpx 在 36rpx 字号下刚好不撑满卡片
    const PUNCT = /[，。、！？；：「」『』（）()]/g;
    lines.forEach((l) => {
        if (typeof l !== "string" || l.length <= cut) {
            out.push(l);
            return;
        }
        // 收集可断位置：每个标点后面（即下一个字符的 index）
        const breaks = new Set();
        PUNCT.lastIndex = 0;
        let m;
        while ((m = PUNCT.exec(l)) !== null) breaks.add(m.index + 1);
        let i = 0;
        while (i < l.length) {
            // 从 i+cut 往回/往前找最近的断点，找不到就硬切在 i+cut
            let next = i + cut;
            if (!breaks.has(next)) {
                let found = -1;
                breaks.forEach((b) => {
                    if (b > i && (found === -1 || Math.abs(b - next) < Math.abs(found - next))) found = b;
                });
                if (found > i + 8) next = found; // 离目标不远才采用，避免一行过短
            }
            out.push(l.slice(i, next));
            i = next;
        }
    });
    return out;
}

// 规范化诗:content 数组 → 字符串,补全各字段
function normPoem(p) {
    if (!p) return null;
    const rawLines = Array.isArray(p.content)
        ? p.content
        : String(p.content || "").split("\n");
    return {
        id: p.id,
        title: p.title || "",
        content: rawLines.join("\n"),
        author: (p.author && p.author.name) || "",
        dynasty: (p.dynasty && p.dynasty.name) || "",
        type: (p.type && p.type.name) || "",
        typeDesc: (p.type && p.type.description) || "",
        lines: wrapLines(rawLines),
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

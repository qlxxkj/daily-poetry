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
            timeout: 5000,
            success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
                else reject(new Error(`HTTP ${res.statusCode}: ${(res.data && res.data.error) || ""}`.trim()));
            },
            fail: (err) => {
                // 网络层错误(超时/fail)且还有重试额度 → 等 800ms 重发一次;
                // 否则 reject。业务 4xx/5xx 走 success 分支,不会进这里。
                if (retry > 0 && /fail|timeout/i.test(err.errMsg || "")) {
                    setTimeout(() => http(method, p, body, retry - 1).then(resolve, reject), 500);
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
    const HARD = 15; // 硬上限：卡片内容宽 606rpx，36rpx+3rpx 字距下 15 字约 579rpx 放得下，16 字就溢出
    // 逗号是七言/五言的强节奏点，允许断到 15 字（含标点，7 言两句各 8 字刚好）
    // 其他句读（。、！？等）只在 12 字内才断，避免拆碎短句
    const COMMA = /[，,]/g;
    const PUNCT = /[。、！？；：「」『』（）()—…]/g;
    lines.forEach((l) => {
        if (typeof l !== "string" || l.length <= HARD) {
            out.push(l);
            return;
        }
        const commaB = [];
        COMMA.lastIndex = 0;
        let m;
        while ((m = COMMA.exec(l)) !== null) commaB.push(m.index + 1);
        commaB.sort((a, b) => a - b);
        const otherB = [];
        PUNCT.lastIndex = 0;
        while ((m = PUNCT.exec(l)) !== null) otherB.push(m.index + 1);
        otherB.sort((a, b) => a - b);
        let i = 0;
        let ci = 0;
        let oi = 0;
        while (i < l.length) {
            let next = i + HARD;
            // 1) 逗号断点（i+6 到 i+HARD 之间）优先——保住七言节奏
            while (ci < commaB.length && commaB[ci] <= i) ci++;
            const c = ci < commaB.length ? commaB[ci] : -1;
            if (c !== -1 && c >= i + 6 && c <= next) {
                next = c;
            } else {
                // 2) 其他句读断点（i+4 到 12 之间）其次
                while (oi < otherB.length && otherB[oi] <= i) oi++;
                const o = oi < otherB.length ? otherB[oi] : -1;
                if (o !== -1 && o >= i + 4 && o <= i + 12) next = o;
                // 3) 都没有 → 硬切在 i+HARD
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

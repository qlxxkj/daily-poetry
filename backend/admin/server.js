const path = require("path");
const express = require("express");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "poetry.db");
const TOKEN = process.env.ADMIN_TOKEN || "changeme";
const PORT = process.env.PORT || 3000;

const db = new Database(DB_PATH, { readonly: false });
db.pragma("journal_mode = WAL");

// 启动时幂等 migration（字段已存在则跳过；DB 只读时静默降级）
try {
    for (const table of ["poems_zh_hans", "poems_zh_hant"]) {
        for (const col of ["audio_url", "video_url", "explanation", "illustration_url"]) {
            const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
            if (!cols.includes(col)) {
                db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT DEFAULT ''`).run();
                console.log(`[migrate] added ${table}.${col}`);
            }
        }
    }
} catch (e) {
    console.warn("[migrate] skipped (DB may be readonly):", e.message);
}

const app = express();
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---------- 鉴权：Bearer Token（cookie 式 session） ----------
function requireAuth(req, res, next) {
    const h = req.headers["authorization"] || "";
    const m = h.match(/^Bearer\s+(.+)$/);
    const token = m ? m[1] : (req.cookies && req.cookies.admin_token) || "";
    if (token !== TOKEN) {
        if (req.xhr || req.headers.accept?.includes("json")) {
            return res.status(401).json({ error: "unauthorized" });
        }
        return res.redirect("/login");
    }
    next();
}

// 登录页
app.get("/login", (req, res) => {
    res.render("login", { error: "" });
});

app.post("/login", (req, res) => {
    const { token } = req.body;
    if (token !== TOKEN) {
        return res.render("login", { error: "token 不对" });
    }
    // 把 token 存进 http-only cookie，之后请求自动带上
    res.setHeader("Set-Cookie", `admin_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`);
    res.redirect(req.body.next || "/");
});

app.post("/logout", (req, res) => {
    res.setHeader("Set-Cookie", "admin_token=; HttpOnly; Path=/; Max-Age=0");
    res.redirect("/login");
});

// cookie 解析（不依赖 express-session，手动读）
function parseCookies(req, res, next) {
    req.cookies = {};
    const c = req.headers.cookie;
    if (c) c.split(";").forEach((s) => {
        const [k, v] = s.trim().split("=");
        if (k) req.cookies[k] = decodeURIComponent(v || "");
    });
    next();
}
app.use(parseCookies);

// 鉴权（/login 和静态资源除外）
app.use((req, res, next) => {
    if (req.path === "/login" || req.path.startsWith("/public/") || req.path === "/logout") return next();
    requireAuth(req, res, next);
});

// 路由
const poemsRouter = require("./routes/poems.js")(db);
const authorsRouter = require("./routes/authors.js")(db);

app.use("/", poemsRouter);
app.use("/authors", authorsRouter);

// 动态下拉数据（朝代/类型）
app.get("/meta/dynasties", (req, res) => {
    res.json(db.prepare("SELECT id, name FROM dynasties_zh_hans ORDER BY start_year").all());
});
app.get("/meta/types", (req, res) => {
    res.json(db.prepare("SELECT id, name, category FROM poetry_types_zh_hans ORDER BY id").all());
});
app.get("/meta/authors?q=*&limit=20", (req, res) => {
    const q = String(req.query.q || "").slice(0, 50);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const rows = q
        ? db.prepare("SELECT id, name FROM authors_zh_hans WHERE name LIKE ? ORDER BY id LIMIT ?")
            .all(`%${q}%`, limit)
        : db.prepare("SELECT id, name FROM authors_zh_hans ORDER BY id LIMIT ?").all(limit);
    res.json(rows);
});

// 首页重定向
app.get("/", (req, res) => res.redirect("/poems"));

app.listen(PORT, () => console.log(`[admin] listening on :${PORT}, db: ${DB_PATH}`));

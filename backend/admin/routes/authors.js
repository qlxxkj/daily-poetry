module.exports = function (db) {
    const router = require("express").Router();

    // 作者列表
    router.get("/", (req, res) => {
        const q = String(req.query.q || "").trim();
        const afterId = parseInt(req.query.after) || 0;
        const limit = Math.min(parseInt(req.query.limit) || 40, 100);

        let sql = `
            SELECT a.*, d.name AS dynasty_name,
                   (SELECT COUNT(*) FROM poems_zh_hans p WHERE p.author_id = a.id) AS poem_count
            FROM authors_zh_hans a
            LEFT JOIN dynasties_zh_hans d ON d.id = a.dynasty_id
            WHERE a.id > ?
        `;
        const params = [afterId];
        if (q) { sql += " AND a.name LIKE ?"; params.push(`%${q}%`); }
        sql += " ORDER BY a.id LIMIT ?";
        params.push(limit + 1);

        const rows = db.prepare(sql).all(...params);
        const hasMore = rows.length > limit;
        rows.pop();

        const dynasties = db.prepare("SELECT id, name FROM dynasties_zh_hans ORDER BY start_year").all();
        res.render("authors/list", { rows, q, hasMore, nextAfter: hasMore ? rows[rows.length - 1]?.id : "", dynasties, filters: { q } });
    });

    // 作者详情/编辑
    router.get("/:id", (req, res) => {
        const id = parseInt(req.params.id);
        const a = db.prepare(`
            SELECT a.*, d.name AS dynasty_name
            FROM authors_zh_hans a
            LEFT JOIN dynasties_zh_hans d ON d.id = a.dynasty_id
            WHERE a.id = ?
        `).get(id);

        if (!a) return res.status(404).send("not found");
        const dynasties = db.prepare("SELECT id, name FROM dynasties_zh_hans ORDER BY start_year").all();
        res.render("authors/edit", { a, dynasties, flash: req.query.saved ? "saved" : "" });
    });

    // 保存作者
    router.post("/:id", (req, res) => {
        const id = parseInt(req.params.id);
        const { name, dynasty_id, description } = req.body;
        const existing = db.prepare("SELECT id FROM authors_zh_hans WHERE id = ?").get(id);
        if (!existing) return res.status(404).send("not found");

        const tx = db.transaction(() => {
            db.prepare("UPDATE authors_zh_hans SET name=?, dynasty_id=?, description=? WHERE id=?")
                .run(name, dynasty_id ? parseInt(dynasty_id) : null, description, id);
            db.prepare("UPDATE authors_zh_hant SET name=?, dynasty_id=?, description=? WHERE id=?")
                .run(name, dynasty_id ? parseInt(dynasty_id) : null, description, id);
        });
        tx();
        res.redirect(`/authors/${id}?saved=1`);
    });

    // 新建作者（表单页）
    router.get("/new", (req, res) => {
        const dynasties = db.prepare("SELECT id, name FROM dynasties_zh_hans ORDER BY start_year").all();
        res.render("authors/new", { dynasties });
    });

    // 新建作者（保存）
    router.post("/new", (req, res) => {
        const { name, dynasty_id, description } = req.body;
        const dynastyId = dynasty_id ? parseInt(dynasty_id) : null;

        const tx = db.transaction(() => {
            const r1 = db.prepare("INSERT INTO authors_zh_hans (name, dynasty_id, description) VALUES (?, ?, ?)")
                .run(name, dynastyId, description);
            const r2 = db.prepare("INSERT INTO authors_zh_hant (name, dynasty_id, description) VALUES (?, ?, ?)")
                .run(name, dynastyId, description);
            return r1.lastInsertRowid;
        });
        const newId = tx();
        res.redirect(`/authors/${newId}?saved=1`);
    });

    return router;
};

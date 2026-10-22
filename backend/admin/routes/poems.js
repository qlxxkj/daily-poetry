module.exports = function (db) {
    const router = require("express").Router();

    // 诗词列表（搜索 + 过滤 + 分页）
    router.get("/poems", (req, res) => {
        const q = String(req.query.q || "").trim();
        const dynastyId = req.query.dynasty_id || "";
        const typeId = req.query.type_id || "";
        const authorId = req.query.author_id || "";
        const afterId = parseInt(req.query.after) || 0;
        const limit = Math.min(parseInt(req.query.limit) || 30, 100);

        let sql = `
            SELECT p.id, p.title, p.content, p.author_id, p.dynasty_id, p.type_id,
                   p.audio_url, p.explanation, p.illustration_url, p.video_url,
                   a.name AS author_name,
                   d.name AS dynasty_name,
                   t.name AS type_name
            FROM poems_zh_hans p
            LEFT JOIN authors_zh_hans a ON a.id = p.author_id
            LEFT JOIN dynasties_zh_hans d ON d.id = p.dynasty_id
            LEFT JOIN poetry_types_zh_hans t ON t.id = p.type_id
            WHERE p.id > ?
        `;
        const params = [afterId];

        if (q) {
            sql += ` AND p.id IN (
                SELECT rowid FROM poems_fts_zh_hans WHERE poems_fts_zh_hans MATCH ?
                UNION SELECT rowid FROM poems_fts_zh_hans WHERE title MATCH ?
            )`;
            params.push(`"${q.replace(/"/g, '""')}"`, `"${q.replace(/"/g, '""')}"`);
        }
        if (dynastyId) { sql += " AND p.dynasty_id = ?"; params.push(dynastyId); }
        if (typeId)    { sql += " AND p.type_id = ?";    params.push(typeId); }
        if (authorId)  { sql += " AND p.author_id = ?";   params.push(authorId); }

        sql += " ORDER BY p.id LIMIT ?";
        params.push(limit + 1);

        const rows = db.prepare(sql).all(...params);
        const hasMore = rows.length > limit;
        rows.pop();

        const dynasties = db.prepare("SELECT id, name FROM dynasties_zh_hans ORDER BY start_year").all();
        const types = db.prepare("SELECT id, name, category FROM poetry_types_zh_hans ORDER BY id").all();

        res.render("poems/list", {
            rows,
            q, dynastyId, typeId, authorId, afterId,
            hasMore,
            nextAfter: hasMore ? rows[rows.length - 1]?.id : "",
            dynasties, types,
            filters: { q, dynasty_id: dynastyId, type_id: typeId, author_id: authorId },
        });
    });

    // 诗词详情/编辑
    router.get("/poems/:id", (req, res) => {
        const id = parseInt(req.params.id);
        const p = db.prepare(`
            SELECT p.*, a.name AS author_name, d.name AS dynasty_name, t.name AS type_name
            FROM poems_zh_hans p
            LEFT JOIN authors_zh_hans a ON a.id = p.author_id
            LEFT JOIN dynasties_zh_hans d ON d.id = p.dynasty_id
            LEFT JOIN poetry_types_zh_hans t ON t.id = p.type_id
            WHERE p.id = ?
        `).get(id);

        if (!p) return res.status(404).send("not found");

        const authors = db.prepare("SELECT id, name FROM authors_zh_hans ORDER BY name LIMIT 500").all();
        const dynasties = db.prepare("SELECT id, name FROM dynasties_zh_hans ORDER BY start_year").all();
        const types = db.prepare("SELECT id, name, category FROM poetry_types_zh_hans ORDER BY id").all();

        res.render("poems/edit", { p, authors, dynasties, types, flash: req.query.saved ? "saved" : "" });
    });

    // 保存诗词（简繁同步）
    router.post("/poems/:id", (req, res) => {
        const id = parseInt(req.params.id);
        const {
            title, content, author_id, dynasty_id, type_id,
            audio_url, video_url, explanation, illustration_url,
        } = req.body;

        // content：textarea 每行一句 → JSON 数组
        let contentJson;
        if (Array.isArray(content)) {
            contentJson = JSON.stringify(content.filter((s) => s.trim()));
        } else {
            const lines = String(content || "").split("\n").map((s) => s.trim()).filter(Boolean);
            contentJson = JSON.stringify(lines);
        }

        // 检查目标 poem 是否存在（防越权 id）
        const existing = db.prepare("SELECT id FROM poems_zh_hans WHERE id = ?").get(id);
        if (!existing) return res.status(404).send("not found");

        const updateHans = db.prepare(`
            UPDATE poems_zh_hans SET
                title = ?, content = ?, author_id = ?, dynasty_id = ?, type_id = ?,
                audio_url = ?, video_url = ?, explanation = ?, illustration_url = ?
            WHERE id = ?
        `);
        const updateHant = db.prepare(`
            UPDATE poems_zh_hant SET
                title = ?, content = ?, author_id = ?, dynasty_id = ?, type_id = ?,
                audio_url = ?, video_url = ?, explanation = ?, illustration_url = ?
            WHERE id = ?
        `);

        const params = [
            title, contentJson,
            author_id ? parseInt(author_id) : null,
            dynasty_id ? parseInt(dynasty_id) : null,
            type_id ? parseInt(type_id) : null,
            audio_url, video_url, explanation, illustration_url,
            id,
        ];

        const tx = db.transaction(() => {
            updateHans.run(...params);
            updateHant.run(...params);
            // 同步 FTS
            const titlePlain = (title || "").replace(/"/g, "");
            db.prepare(
                "INSERT INTO poems_fts_zh_hans(poems_fts_zh_hans, rowid, title, content_text) VALUES('delete', ?, ?, ?)"
            ).run(id, title, String(contentJson));
            db.prepare(
                "INSERT INTO poems_fts_zh_hans(poems_fts_zh_hans, rowid, title, content_text) VALUES('reinsert', ?, ?, ?)"
            ).run(id, title, String(contentJson));
        });
        tx();

        res.redirect(`/poems/${id}?saved=1`);
    });

    return router;
};

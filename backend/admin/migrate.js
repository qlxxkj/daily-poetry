// 幂等 migration：给 poems_zh_hans / poems_zh_hant 加新字段
// 运行：node migrate.js（可重复执行，不会报错）
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "poetry.db");
const db = new Database(DB_PATH, { readonly: false });
db.pragma("journal_mode = WAL");

function addColumn(table, col, def) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (cols.includes(col)) {
        console.log(`  skip: ${table}.${col} already exists`);
        return;
    }
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT DEFAULT '${def}'`).run();
    console.log(`  add:  ${table}.${col}`);
}

const FIELDS = [
    ["audio_url", ""],
    ["video_url", ""],
    ["explanation", ""],
    ["illustration_url", ""],
];

for (const table of ["poems_zh_hans", "poems_zh_hant"]) {
    console.log(`\n${table}:`);
    for (const [col, def] of FIELDS) addColumn(table, col, def);
}

db.close();
console.log("\nDone.");

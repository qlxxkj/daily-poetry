// 暗色主题切换（localStorage 记忆）
(function () {
    const KEY = "poetry-admin-theme";
    const apply = (dark) => {
        document.documentElement.classList.toggle("t-dark", dark);
        const btn = document.getElementById("theme-toggle");
        if (btn) btn.textContent = dark ? "○" : "◐";
    };
    apply(localStorage.getItem(KEY) === "dark");
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("#theme-toggle");
        if (!btn) return;
        const dark = !document.documentElement.classList.contains("t-dark");
        localStorage.setItem(KEY, dark ? "dark" : "light");
        apply(dark);
    });
})();

// 诗词编辑页：作者搜索 → 填入 author_id 输入框（通过 select option 动态插入）
document.addEventListener("DOMContentLoaded", () => {
    const searchEl = document.getElementById("author_search");
    const sel = document.getElementById("author_sel");
    if (!searchEl || !sel) return;

    let timer = null;
    searchEl.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const q = searchEl.value.trim();
            if (!q) return;
            const res = await fetch(`/meta/authors?q=${encodeURIComponent(q)}&limit=10`);
            const list = await res.json();
            // 只保留 "无" + 搜索结果
            const none = sel.querySelector('option[value=""]');
            sel.innerHTML = "";
            if (none) sel.appendChild(none.cloneNode(true));
            list.forEach(a => {
                const opt = document.createElement("option");
                opt.value = a.id;
                opt.textContent = a.name;
                sel.appendChild(opt);
            });
            if (list.length === 1) sel.value = list[0].id;
        }, 250);
    });
});

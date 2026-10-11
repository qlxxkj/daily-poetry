# -*- coding: utf-8 -*-
"""静态校验：JS 语法 / WXML 结构 / class 引用 / 资源存在性。"""
import os, re, glob, subprocess, sys, json

ROOT = r"D:/vswork/daily-poetry/miniapp"
NODE = r"C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-6/node.exe"

fail = 0
def bad(msg):
    global fail
    fail += 1
    print("  FAIL  " + msg)

# ---------------- 1. JSON 合法性 ----------------
print("[json]")
for f in glob.glob(os.path.join(ROOT, "**", "*.json"), recursive=True):
    rel = os.path.relpath(f, ROOT).replace("\\", "/")
    if ".workbuddy" in rel:
        continue
    try:
        json.load(open(f, encoding="utf-8"))
    except Exception as e:
        bad("%s  %s" % (rel, e))
print("  checked")

# ---------------- 2. JS 语法 ----------------
print("[js]")
js = sorted(glob.glob(os.path.join(ROOT, "**", "*.js"), recursive=True))
for f in js:
    if ".workbuddy" in f:
        continue
    r = subprocess.run([NODE, "--check", f], capture_output=True, text=True)
    rel = os.path.relpath(f, ROOT).replace("\\", "/")
    if r.returncode != 0:
        bad("%s\n        %s" % (rel, (r.stderr or "").strip()[:300]))
    else:
        print("  ok    " + rel)

# ---------------- 3. WXML 结构 ----------------
VOID = {"image", "input", "icon", "import", "include", "wxs", "slot", "textarea",
        "progress", "canvas", "video", "audio", "camera", "map", "open-data", "web-view"}
print("[wxml]")
wxmls = sorted(glob.glob(os.path.join(ROOT, "**", "*.wxml"), recursive=True))
for f in wxmls:
    if ".workbuddy" in f:
        continue
    rel = os.path.relpath(f, ROOT).replace("\\", "/")
    s = open(f, encoding="utf-8").read()
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    err = []
    i = 0
    while True:
        a = s.find("{{", i)
        if a < 0:
            break
        b = s.find("}}", a + 2)
        if b < 0:
            err.append("unclosed {{")
            break
        if "{" in s[a + 2:b] or "}" in s[a + 2:b]:
            err.append("nested brace: " + s[a + 2:b][:40])
        i = b + 2
    stack = []
    for m in re.finditer(r"<(/?)([a-zA-Z][-\w]*)([^>]*?)(/?)>", s):
        close, name, selfc = m.group(1), m.group(2).lower(), m.group(4)
        ln = s[:m.start()].count("\n") + 1
        if close:
            if not stack:
                err.append("L%d extra </%s>" % (ln, name))
            elif stack[-1][0] != name:
                err.append("L%d expect </%s> got </%s>" % (ln, stack[-1][0], name))
            else:
                stack.pop()
        elif selfc or name in VOID or name.startswith("wx"):
            pass
        else:
            stack.append((name, ln))
    if stack:
        err.append("L%d unclosed <%s>" % (stack[-1][1], stack[-1][0]))
    if err:
        bad("%s  %s" % (rel, err))
    else:
        print("  ok    " + rel)

# ---------------- 4. class 引用 ----------------
print("[class]")
css = ""
for f in glob.glob(os.path.join(ROOT, "**", "*.wxss"), recursive=True):
    if ".workbuddy" in f:
        continue
    css += open(f, encoding="utf-8").read() + "\n"
# 去掉 @import（已按文件合并过）
css = re.sub(r"@import[^;]+;", "", css)
defined = set(re.findall(r"\.([A-Za-z][-\w]*)", css))

used = {}
for f in wxmls:
    if ".workbuddy" in f:
        continue
    rel = os.path.relpath(f, ROOT).replace("\\", "/")
    s = open(f, encoding="utf-8").read()
    for m in re.finditer(r'class="([^"]*)"', s):
        raw = m.group(1)
        toks = []
        # {{ }} 里的三元表达式不能按空格切碎：先取出块内的字符串字面量再整块剔除
        for blk in re.findall(r"\{\{(.*?)\}\}", raw, flags=re.S):
            # 三元里只有「? 之后」才是类名，? 之前的 'dark' 这类是比较值，不算
            tail = blk.split("?", 1)[1] if "?" in blk else ""
            toks += [a or b for a, b in re.findall(r"'([^']*)'|\"([^\"]*)\"", tail)]
        plain = re.sub(r"\{\{.*?\}\}", " ", raw, flags=re.S)
        toks += re.split(r"\s+", plain)
        for tok in toks:
            tok = tok.strip()
            if not tok:
                continue
            used.setdefault(tok, set()).add(rel)

missing = sorted([c for c in used if c not in defined])
for c in missing:
    bad("class .%s 未定义（用于 %s）" % (c, sorted(used[c])[0]))
print("  %d 个 class 引用，%d 个未定义" % (len(used), len(missing)))

# ---------------- 5. 资源与组件引用 ----------------
print("[assets]")
app = json.load(open(os.path.join(ROOT, "app.json"), encoding="utf-8"))
for t in app["tabBar"]["list"]:
    p = os.path.join(ROOT, t["pagePath"] + ".js")
    if not os.path.exists(p):
        bad("tabBar 页面不存在 " + t["pagePath"])
for p in app["pages"]:
    for ext in (".js", ".json", ".wxml"):
        if not os.path.exists(os.path.join(ROOT, p + ext)):
            bad("页面缺文件 " + p + ext)
for f in ("avatar-default.png", "avatar-default-dark.png"):
    if not os.path.exists(os.path.join(ROOT, "assets", f)):
        bad("缺头像资源 " + f)
for k in ("today", "fh", "mine"):
    for suf in ("", "-active", "-dark", "-active-dark"):
        p = os.path.join(ROOT, "assets", "tabbar", "%s%s.png" % (k, suf))
        if not os.path.exists(p):
            bad("缺 tabBar 图标 assets/tabbar/%s%s.png" % (k, suf))

for f in glob.glob(os.path.join(ROOT, "pages", "*", "*.json")) + glob.glob(os.path.join(ROOT, "custom-tab-bar", "*.json")):
    d = json.load(open(f, encoding="utf-8"))
    for name, path in (d.get("usingComponents") or {}).items():
        base = os.path.join(ROOT, path.lstrip("/").replace("/", os.sep))
        if not (os.path.exists(base + ".js") and os.path.exists(base + ".wxml")):
            bad("%s 引用的组件不存在: %s -> %s" % (os.path.relpath(f, ROOT), name, path))

# ---------------- 6. 页面事件都有实现 ----------------
print("[bindings]")
for f in wxmls:
    if ".workbuddy" in f:
        continue
    s = open(f, encoding="utf-8").read()
    d = os.path.dirname(f)
    jsfile = os.path.join(d, os.path.basename(f).replace(".wxml", ".js"))
    if not os.path.exists(jsfile):
        continue
    src = open(jsfile, encoding="utf-8").read()
    for h in re.findall(r'bind(?:tap|:(\w+))="([^"]+)"', s):
        name = h[1]
        if name not in src:
            bad("%s 绑定了 %s，但 %s 里没有实现" % (
                os.path.relpath(f, ROOT).replace("\\", "/"), name,
                os.path.basename(jsfile)))
print("  checked")

print()
print("=== %s ===" % ("全部通过" if not fail else "%d 项问题" % fail))
sys.exit(1 if fail else 0)

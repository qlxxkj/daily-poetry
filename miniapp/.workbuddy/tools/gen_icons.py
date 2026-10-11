# -*- coding: utf-8 -*-
"""生成小程序图标资产。

图标方案：mask-image + background-color。
一个图标只需一份 SVG 资产，颜色由 CSS 变量 ``--ic`` 决定 —— 深浅两个主题、
acc/w/ok 各种语义变体都能复用，不必为每种颜色各生成一份 base64
（原先 8 图标 × 5 变体就有 40 份，且无法跟着主题走）。

tabBar 只吃本地 PNG，另外生成；默认头像同理。
"""
import math, zlib, struct, base64, os

OUT = r"D:/vswork/daily-poetry/miniapp"
TABBAR_DIR = os.path.join(OUT, "assets", "tabbar")
AVATAR_DIR = os.path.join(OUT, "assets")
STYLES_DIR = os.path.join(OUT, "styles")
for d in (TABBAR_DIR, AVATAR_DIR, STYLES_DIR):
    os.makedirs(d, exist_ok=True)

# ============================================================ PNG 编码
def _chunk(tag, data):
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

def write_png(path, w, h, rows):
    raw = b"".join(b"\x00" + r for r in rows)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    blob = (b"\x89PNG\r\n\x1a\n" + _chunk(b"IHDR", ihdr)
            + _chunk(b"IDAT", zlib.compress(raw, 9)) + _chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(blob)
    return len(blob)

# ============================================================ 距离场
def sd_seg(px, py, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    d2 = dx * dx + dy * dy
    t = 0.0 if d2 == 0 else ((px - x1) * dx + (py - y1) * dy) / d2
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))

def sd_rr(px, py, x0, y0, x1, y1, r):
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    hx, hy = (x1 - x0) / 2.0 - r, (y1 - y0) / 2.0 - r
    qx, qy = abs(px - cx) - hx, abs(py - cy) - hy
    return math.hypot(max(qx, 0.0), max(qy, 0.0)) + min(max(qx, qy), 0.0) - r

def sd_ring(px, py, cx, cy, r):
    return abs(math.hypot(px - cx, py - cy) - r)

def sd_disc(px, py, cx, cy, r):
    return math.hypot(px - cx, py - cy) - r

def sd_dome(px, py, cx, cy, r):
    """上半圆（半圆盘）—— 人像图标的肩部。用 max 求「圆 ∩ 上半平面」的交集。"""
    return max(sd_disc(px, py, cx, cy, r), py - cy)

# ============================================================ tabBar 图形
def calendar():
    return ([(sd_rr, (16, 22, 65, 68, 9), 5.5),
             (sd_seg, (26, 13, 26, 24), 5.5),
             (sd_seg, (55, 13, 55, 24), 5.5),
             (sd_seg, (16, 35, 65, 35), 5.5)],
            [(sd_disc, (40.5, 51.5, 5.5))])

def flower():
    # 真机 tabBar 只有 ~27px，靠「瓣大 + 线粗」换辨识度，不加细节
    cx = cy = 40.5
    s = []
    for i in range(5):
        a = math.radians(-90 + i * 72)
        s.append((sd_ring, (cx + 16.5 * math.cos(a), cy + 16.5 * math.sin(a), 10.0), 6.0))
    return s, []

def person():
    # 头 + 肩组成的剪影，是最不容易在小尺寸下糊掉的人像表达
    return [], [(sd_disc, (40.5, 22.0, 11.5)), (sd_dome, (40.5, 68.0, 26.0))]

TABBAR = {"today": calendar, "fh": flower, "mine": person}

# 未选中 / 选中，各主题一套（tabBar 只吃 PNG，没法用 CSS 变量着色）
TABBAR_COLOR = {
    "light": ((0x76, 0x6D, 0x6A), (0xA5, 0x49, 0x2B)),
    "dark":  ((0xB2, 0xAA, 0xA8), (0xE7, 0x8F, 0x73)),
}

def raster(builder, rgb, size=81, ss=4):
    strokes, fills = builder()
    rows = []
    inv = 1.0 / (ss * ss)
    for y in range(size):
        row = bytearray()
        for x in range(size):
            acc = 0
            for sy in range(ss):
                py = y + (sy + 0.5) / ss
                for sx in range(ss):
                    px = x + (sx + 0.5) / ss
                    hit = False
                    for fn, arg, w in strokes:
                        # 必须取绝对值：sd_rr 是带符号距离，内部为负，
                        # 直接比 <= w/2 会把整个矩形填满
                        if abs(fn(px, py, *arg)) <= w / 2.0:
                            hit = True
                            break
                    if not hit:
                        for fn, arg in fills:
                            if fn(px, py, *arg) <= 0:
                                hit = True
                                break
                    if hit:
                        acc += 1
            a = acc * inv
            if a > 0:
                row += bytes((rgb[0], rgb[1], rgb[2], int(round(255 * a))))
            else:
                row += b"\x00\x00\x00\x00"
        rows.append(bytes(row))
    return rows

print("[tabbar png]")
for theme in ("light", "dark"):
    plain, active = TABBAR_COLOR[theme]
    for name, builder in TABBAR.items():
        for suffix, rgb in (("", plain), ("-active", active)):
            fn = f"{name}{suffix}.png" if theme == "light" else f"{name}{suffix}-dark.png"
            p = os.path.join(TABBAR_DIR, fn)
            n = write_png(p, 81, 81, raster(builder, rgb))
            print("  %-24s %5dB" % (fn, n))

# ============================================================ 默认头像
def avatar_rows(size, bg, fg):
    # raster 里 1 像素 = 设计坐标 1 单位，图形定义在 81x81 空间。
    # 直接按 size=240 渲染会把剪影丢在左上角 81x81 的角落里，所以先在 81
    # 空间用高倍超采样渲出剪影，再按 81 -> size 双线性放大。
    def person_shape():
        return [], [(sd_disc, (40.5, 29.0, 14.5)), (sd_dome, (40.5, 76.0, 29.0))]

    base = raster(person_shape, fg, size=81, ss=8)
    k = 81.0 / size
    rows = []
    for y in range(size):
        fy = min(max((y + 0.5) * k - 0.5, 0.0), 80.0)
        y0 = int(fy)
        y1 = min(y0 + 1, 80)
        ty = fy - y0
        row = bytearray()
        for x in range(size):
            fx = min(max((x + 0.5) * k - 0.5, 0.0), 80.0)
            x0 = int(fx)
            x1 = min(x0 + 1, 80)
            tx = fx - x0
            # 四个邻居的双线性权重
            w00 = (1 - tx) * (1 - ty)
            w10 = tx * (1 - ty)
            w01 = (1 - tx) * ty
            w11 = tx * ty
            a = (base[y0][x0 * 4 + 3] * w00 + base[y0][x1 * 4 + 3] * w10
                 + base[y1][x0 * 4 + 3] * w01 + base[y1][x1 * 4 + 3] * w11) / 255.0
            row += bytes((int(fg[0] * a + bg[0] * (1 - a)),
                          int(fg[1] * a + bg[1] * (1 - a)),
                          int(fg[2] * a + bg[2] * (1 - a)), 255))
        rows.append(bytes(row))
    return rows

print("[avatar]")
for suffix, bg, fg in (("", (0xE9, 0xE2, 0xDF), (0xB0, 0xA6, 0xA1)),
                       ("-dark", (0x2A, 0x25, 0x24), (0x6B, 0x62, 0x5F))):
    fn = f"avatar-default{suffix}.png"
    p = os.path.join(AVATAR_DIR, fn)
    n = write_png(p, 240, 240, avatar_rows(240, bg, fg))
    print("  %-24s %5dB" % (fn, n))

# ============================================================ 页面内图标（mask）
# 只描路径，颜色由 background-color 提供，故 mask 源里的 stroke 用纯黑即可
BODY = {
    "refresh": '<path d="M20.5 12a8.5 8.5 0 0 0-14.6-5.9L3 9"/><path d="M3 3.5V9h5.5"/>'
               '<path d="M3.5 12a8.5 8.5 0 0 0 14.6 5.9L21 15"/><path d="M21 20.5V15h-5.5"/>',
    "copy": '<rect x="9" y="9" width="12" height="12" rx="2.5"/>'
            '<path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5"/>',
    "chevron": '<path d="m9 18 6-6-6-6"/>',
    "back": '<path d="m15 18-6-6 6-6"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>',
    "close": '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    "check": '<path d="M20 6.5 9 17.5l-5-5"/>',
    "alert": '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.4h.01"/>',
    "heart": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2'
             '-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    "heart-fill": '<path fill="#000" stroke="none" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3'
                  'c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5'
                  'c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    "share": '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>'
             '<path d="m8.6 13.5 6.8 3.9"/><path d="M15.4 6.6 8.6 10.5"/>',
    "image": '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/>'
             '<path d="m21 15-4.3-4.3a2 2 0 0 0-2.8 0L3 21"/>',
    "moon": '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    "lang": '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>'
            '<path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
    "trash": '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>'
             '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/>',
    "camera": '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9'
              'a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    "bookmark": '<path d="M19 21 12 16.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>',
}

def mask_uri(body):
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" '
           'fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" '
           'stroke-linejoin="round">%s</svg>' % body)
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode("ascii")

L = [
    "/* --------------------------------------------------------------------------",
    "   图标：一份 SVG 做 mask，颜色由 background-color 提供（CSS 变量 --ic）。",
    "   好处：深浅两个主题、各种语义色共用同一份资产，不需要为每种颜色各存一份 base64。",
    "   用法：<view class=\"ic ic-heart ic--acc\" />",
    "   -------------------------------------------------------------------------- */",
    ".ic {",
    "    --ic: var(--ink-3);",
    "    background-color: var(--ic);",
    "    -webkit-mask-repeat: no-repeat;",
    "    mask-repeat: no-repeat;",
    "    -webkit-mask-position: center;",
    "    mask-position: center;",
    "    -webkit-mask-size: 100% 100%;",
    "    mask-size: 100% 100%;",
    "}",
    "",
    "/* 语义色：叠加在 ic 上改写 --ic 即可 */",
    ".ic--ink { --ic: var(--ink); }",
    ".ic--ink2 { --ic: var(--ink-2); }",
    ".ic--acc { --ic: var(--accent); }",
    ".ic--w { --ic: var(--on-solid); }",
    ".ic--ok { --ic: var(--ok); }",
    ".ic--err { --ic: var(--err); }",
    ".ic--line { --ic: var(--line); }",
    "",
]
for name, body in BODY.items():
    u = mask_uri(body)
    L.append('.ic-%s { -webkit-mask-image: url("%s"); mask-image: url("%s"); }'
             % (name, u, u))
L.append("")
wxss = "\n".join(L)
with open(os.path.join(STYLES_DIR, "icons.wxss"), "w", encoding="utf-8") as f:
    f.write(wxss)
print("[icons.wxss] %d icons, %dB" % (len(BODY), len(wxss)))

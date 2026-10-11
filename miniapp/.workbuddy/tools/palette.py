# -*- coding: utf-8 -*-
"""浅色 / 深色双主题 token 生成 + WCAG 对比度校验。
选值走 OKLCH 感知均匀空间，最终落地 hex（小程序 WebView 对 oklch() 支持不稳）。
中性色统一带朱砂暖调 hue 40；深色模式用「提亮的表面 + 压暗的文字」反向阶梯。"""
import math

def oklch_to_hex(L, C, H):
    h = math.radians(H)
    a, b = C * math.cos(h), C * math.sin(h)
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_**3, m_**3, s_**3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    def f(c):
        c = max(0.0, min(1.0, c))
        c = 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
        return int(round(max(0.0, min(1.0, c)) * 255))
    return "#%02X%02X%02X" % (f(r), f(g), f(bb))

def rel_lum(hexc):
    hexc = hexc.lstrip("#")
    ch = [int(hexc[i:i+2], 16) / 255 for i in (0, 2, 4)]
    ch = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in ch]
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]

def ratio(fg, bg):
    a, b = rel_lum(fg), rel_lum(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)

LIGHT = {
    "bg":        (0.975, 0.004, 40),
    "card":      (0.993, 0.002, 40),
    "fill":      (0.960, 0.006, 40),
    "fill-2":    (0.935, 0.008, 40),
    "line":      (0.925, 0.006, 40),
    "ink":       (0.240, 0.012, 40),
    "ink-2":     (0.480, 0.012, 40),
    "ink-3":     (0.543, 0.012, 40),
    "accent":    (0.520, 0.130, 38),
    "accent-bg": (0.960, 0.018, 38),
    "on-solid":  (0.985, 0.004, 40),
    "ok":        (0.520, 0.090, 155),
    "ok-bg":     (0.960, 0.025, 155),
    "err":       (0.530, 0.150, 28),
    "err-bg":    (0.965, 0.018, 28),
}

# 深色：表面不是纯黑，而是带暖调的深墨；强调色必须提亮才能在深底上达到 4.5:1
DARK = {
    "bg":        (0.180, 0.006, 40),
    "card":      (0.235, 0.007, 40),
    "fill":      (0.295, 0.008, 40),
    "fill-2":    (0.345, 0.009, 40),
    "line":      (0.320, 0.008, 40),
    "ink":       (0.945, 0.008, 40),
    "ink-2":     (0.815, 0.010, 40),
    "ink-3":     (0.745, 0.010, 40),
    "accent":    (0.735, 0.115, 38),
    "accent-bg": (0.300, 0.035, 38),
    "on-solid":  (0.190, 0.010, 40),
    "ok":        (0.760, 0.100, 155),
    "ok-bg":     (0.285, 0.045, 155),
    "err":       (0.755, 0.115, 28),
    "err-bg":    (0.300, 0.045, 28),
}

CHECKS = [
    ("ink on card",         "ink",     "card",      4.5),
    ("ink on bg",           "ink",     "bg",        4.5),
    ("ink-2 on card",       "ink-2",   "card",      4.5),
    ("ink-2 on fill",       "ink-2",   "fill",      4.5),
    ("ink-3 on card",       "ink-3",   "card",      4.5),
    ("ink-3 on bg",         "ink-3",   "bg",        4.5),
    ("accent on card",      "accent",  "card",      4.5),
    ("accent on accent-bg", "accent",  "accent-bg", 4.5),
    ("on-solid on ink",     "on-solid","ink",       4.5),
    ("on-solid on accent",  "on-solid","accent",    4.5),
    ("ok on ok-bg",         "ok",      "ok-bg",     4.5),
    ("err on err-bg",       "err",     "err-bg",    4.5),
    ("err on card",         "err",     "card",      4.5),
    ("card / bg 层次差",     "card",    "bg",        1.0),  # 只打印，不做判定
    ("line / card 层次差",   "line",    "card",      1.0),
]

for name, P in (("浅色 LIGHT", LIGHT), ("深色 DARK", DARK)):
    HEX = {k: oklch_to_hex(*v) for k, v in P.items()}
    print("=" * 62)
    print(name)
    print("-" * 62)
    for k in P:
        print("    --%-9s %s" % (k, HEX[k]))
    print()
    bad = 0
    for label, f, b, need in CHECKS:
        r = ratio(HEX[f], HEX[b])
        if need <= 1.0:
            print("    %-22s %6.3f:1  (层次参考)" % (label, r))
            continue
        ok = r >= need
        if not ok:
            bad += 1
        print("    %-22s %6.2f:1  %s" % (label, r, "PASS" if ok else "**FAIL**"))
    print("    ->", "全部通过 WCAG AA" if not bad else "%d 项不达标" % bad)
    print()

print("=" * 62)
print("CSS 输出 / light")
print(", ".join("    --%s: %s;" % (k, oklch_to_hex(*v)) for k, v in LIGHT.items()).replace(", \n", "\n"))

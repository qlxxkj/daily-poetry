# -*- coding: utf-8 -*-
"""把 WXSS 转成浏览器 CSS，复刻各页面生成预览 HTML 用于截图验证。
1rpx = 0.5px（750rpx 对应 375px 屏宽）。
组件（navbar / tabbar / share-sheet）直接复用真实 wxss + 镜像其 wxml，
这样深浅两套主题的取色也是同一份实现，验证才有意义。

界面文案从 LANG 词典取（与 utils/i18n.js 一一对应），支持 hans / hant 两套，
方便验证「简繁切换 → 全部 UI 文案跟着变」这件事。"""
import re, os, base64

ROOT = r"D:/vswork/daily-poetry/miniapp"
OUT = r"C:/Users/Administrator/AppData/Local/Temp"
DEST = os.path.join(ROOT, ".workbuddy", "design-preview")

# ---- 与 utils/i18n.js 对应的双语文案（key 完全一致）----
LANG = {
    "hans": {
        "tab_today": "今日", "tab_fh": "飞花令", "tab_mine": "我的",
        "nav_query": "查询", "nav_fav": "我的收藏",
        "today_seal": "诗", "today_welcome": "从三十七万首里，随机取一首",
        "today_pick": "再抽一首", "today_empty": "抽一首", "today_empty_loading": "正在抽诗…",
        "aria_fav": "收藏", "aria_copy": "复制", "aria_share": "分享", "aria_detail": "详情",
        "mine_nick_ph": "点击设置昵称", "mine_faved_prefix": "已收藏 ", "mine_faved_suffix": " 首",
        "mine_appearance": "外观", "mine_text": "文字",
        "sec_fav": "我的收藏", "sec_settings": "我的设置", "sec_share": "分享", "sec_about": "关于",
        "about_version": "版本", "mine_myfav": "我收藏的诗词", "mine_nofav": "还没有收藏",
        "share_friend": "分享给好友", "share_moments": "分享到朋友圈", "moments_hint": "点右上角「···」",
        "about_brand": "一诗一令", "about_desc": "每日一诗 · 飞花令 · 全文查询",
        "theme_auto": "跟随系统", "theme_light": "浅色", "theme_dark": "深色",
        "lang_hans": "简体中文", "lang_hant": "繁體中文",
        "query_ph": "诗名 / 作者 / 朝代 / 诗句", "query_go": "查询", "query_try": "试试这些",
        "query_count_prefix": "共 ", "query_count_suffix": " 首", "query_empty": "没有找到相关诗词，换个词试试",
        "fav_on": "已收藏", "fav_off": "收藏", "copy": "复制",
        "fh_desc": "取一个字，觅一首含它的诗", "fh_ph": "字", "fh_play": "抽诗", "fh_change": "换一首",
        "fav_count_prefix": "共 ", "fav_count_suffix": " 首 · 存在本机",
        "fav_empty_title": "还没有收藏的诗",
        "fav_empty_hint": "在今日一诗、飞花令或查询结果里点 ♡ 就能收进来",
        "fav_gotoday": "去看看今日一诗",
        "ss_friend": "微信好友", "ss_moments": "朋友圈", "ss_copy": "复制全文", "ss_cancel": "取消",
        "share_brand": "一诗一令古诗词", "share_daily": "每日一诗", "share_fh_tag": "飞花令",
        "share_query_tag": "全文查询", "share_fav_tag": "我的收藏",
    },
    "hant": {
        "tab_today": "今日", "tab_fh": "飛花令", "tab_mine": "我的",
        "nav_query": "查詢", "nav_fav": "我的收藏",
        "today_seal": "詩", "today_welcome": "從三十七萬首裡，隨機取一首",
        "today_pick": "再抽一首", "today_empty": "抽一首", "today_empty_loading": "正在抽詩…",
        "aria_fav": "收藏", "aria_copy": "複製", "aria_share": "分享", "aria_detail": "詳情",
        "mine_nick_ph": "點擊設置昵稱", "mine_faved_prefix": "已收藏 ", "mine_faved_suffix": " 首",
        "mine_appearance": "外觀", "mine_text": "文字",
        "sec_fav": "我的收藏", "sec_settings": "我的設置", "sec_share": "分享", "sec_about": "關於",
        "about_version": "版本", "mine_myfav": "我收藏的詩詞", "mine_nofav": "還沒有收藏",
        "share_friend": "分享給好友", "share_moments": "分享到朋友圈", "moments_hint": "點右上角「···」",
        "about_brand": "一詩一令", "about_desc": "每日一詩 · 飛花令 · 全文查詢",
        "theme_auto": "跟隨系統", "theme_light": "淺色", "theme_dark": "深色",
        "lang_hans": "簡體中文", "lang_hant": "繁體中文",
        "query_ph": "詩名 / 作者 / 朝代 / 詩句", "query_go": "查詢", "query_try": "試試這些",
        "query_count_prefix": "共 ", "query_count_suffix": " 首", "query_empty": "沒有找到相關詩詞，換個詞試試",
        "fav_on": "已收藏", "fav_off": "收藏", "copy": "複製",
        "fh_desc": "取一個字，覓一首含它的詩", "fh_ph": "字", "fh_play": "抽詩", "fh_change": "換一首",
        "fav_count_prefix": "共 ", "fav_count_suffix": " 首 · 存在本機",
        "fav_empty_title": "還沒有收藏的詩",
        "fav_empty_hint": "在今日一詩、飛花令或查詢結果裡點 ♡ 就能收進來",
        "fav_gotoday": "去看看今日一詩",
        "ss_friend": "微信好友", "ss_moments": "朋友圈", "ss_copy": "複製全文", "ss_cancel": "取消",
        "share_brand": "一詩一令古詩詞", "share_daily": "每日一詩", "share_fh_tag": "飛花令",
        "share_query_tag": "全文查詢", "share_fav_tag": "我的收藏",
    },
}

def rpx(css):
    return re.sub(r"(-?[\d.]+)rpx", lambda m: "%gpx" % (float(m.group(1)) * 0.5), css)

def load(rel):
    s = open(os.path.join(ROOT, rel.replace("/", os.sep)), encoding="utf-8").read()
    s = re.sub(r"@import[^;]+;", "", s)
    return rpx(s)

icons = load("styles/icons.wxss")
app = load("app.wxss")
# 设计系统变量挂在小程序的 page 上；预览里没有 page，也要挂一份到 .phone
app = re.sub(r"(^|\n)page \{", r"\1page, .phone {", app)
pages_css = {p: load("pages/%s/%s.wxss" % (p, p))
             for p in ("today", "fh", "query", "poem", "mine", "favorites")}
navbar_css = load("components/navbar/navbar.wxss")
sheet_css = load("components/share-sheet/share-sheet.wxss")
tab_css = load("custom-tab-bar/index.wxss")

def b64(rel):
    return ("data:image/png;base64,"
            + base64.b64encode(open(os.path.join(ROOT, rel.replace("/", os.sep)), "rb").read()).decode())

# ============================================================ 组件镜像
def navbar(T, title, theme, back=False, search=False):
    cls = ["nb"]
    if theme == "dark":
        cls.append("nb--dark")
    inset = 96 + (36 if search else 0)   # 与组件算法一致：胶囊宽 + 查询按钮槽位
    return ('<div class="%s" style="height:64px">'
            '<div class="nb__status" style="height:20px"></div>'
            '<div class="nb__bar" style="height:44px;padding-right:96px">'
            '<div class="nb__side">%s</div>'
            '<div class="nb__side nb__side--right">%s</div>'
            '<div class="nb__title" style="left:%dpx;right:%dpx">'
            '<span class="nb__title-text">%s</span></div>'
            '</div></div>'
            % (" ".join(cls),
               '<div class="nb__btn"><div class="ic ic-back nb__ic"></div></div>' if back else "",
               '<div class="nb__btn"><div class="ic ic-search nb__ic"></div></div>' if search else "",
               inset, inset, title))

def tabbar(T, active, theme):
    items = ""
    for key, tkey in (("today", "tab_today"), ("fh", "tab_fh"), ("mine", "tab_mine")):
        on = key == active
        src = b64("assets/tabbar/%s%s%s.png" % (key, "-active" if on else "", "-dark" if theme == "dark" else ""))
        items += ('<div class="tb__item%s"><img class="tb__ic" src="%s">'
                  '<span class="tb__text">%s</span></div>' % (" tb__item--on" if on else "", src, T[tkey]))
    return ('<div class="tb%s"><div class="tb__inner">%s</div><div class="tb__safe"></div></div>'
            % (" tb--dark" if theme == "dark" else "", items))

def share_sheet(T, theme, title, sub):
    return ('<div class="ss%s">'
            '<div class="ss__mask"></div>'
            '<div class="ss__sheet">'
            '<div class="ss__head"><span class="ss__title serif">%s</span><span class="ss__sub">%s</span></div>'
            '<div class="ss__grid">'
            '<div class="ss__item"><div class="ss__icbox"><div class="ic ic-share ss__ic"></div></div><span class="ss__label">%s</span></div>'
            '<div class="ss__item"><div class="ss__icbox"><div class="ic ic-image ss__ic"></div></div><span class="ss__label">%s</span></div>'
            '<div class="ss__item"><div class="ss__icbox"><div class="ic ic-copy ss__ic"></div></div><span class="ss__label">%s</span></div>'
            '</div>'
            '<div class="ss__cancel">%s</div>'
            '</div></div>' % (" ss--dark" if theme == "dark" else "", title, sub,
                             T["ss_friend"], T["ss_moments"], T["ss_copy"], T["ss_cancel"]))

def screen(T, nav, content, active=None, theme="light", overlay=""):
    bar = tabbar(T, active, theme) if active else ""
    return ('<div class="phone%s"><div class="viewport">%s%s</div>%s%s</div>'
            % (" t-dark" if theme == "dark" else "", nav, content, bar, overlay))

def dk(theme):
    return " t-dark" if theme == "dark" else ""

QUICK = ["春", "月", "花", "风", "雪", "山", "水", "云"]
def chips(cur=None):
    return "".join('<div class="chip%s">%s</div>' % (" chip--on" if c == cur else "", c) for c in QUICK)

# ---------- 诗词卡片（含卡片右上角的纯图标动作） ----------
def poem_top(T, faved=False, with_detail=False):
    meta = ('<div class="poem__meta"><span class="tag tag--accent">唐</span>'
            '<span class="poem__author">李白</span>'
            '<span class="poem__type">五言绝句</span></div>')
    acts = ('<div class="pact%s"><div class="ic %s%s"></div></div>'
            % (" pact--on" if faved else "",
               "ic-heart-fill" if faved else "ic-heart",
               " ic--acc" if faved else ""))
    acts += '<div class="pact"><div class="ic ic-copy"></div></div>'
    acts += '<div class="pact"><div class="ic ic-share"></div></div>'
    if with_detail:
        acts += '<div class="pact"><div class="ic ic-chevron"></div></div>'
    return '<div class="poem__top">%s<div class="poem__acts">%s</div></div>' % (meta, acts)

def poem_card_full(T, title, author, dynasty, typ, lines, note=None, faved=False, with_detail=False):
    ls = "".join('<div class="poem__line">%s</div>' % l for l in lines)
    n = '<div class="poem__note">%s</div>' % note if note else ""
    return ('<div class="card poem rise">'
            + poem_top(T, faved, with_detail)
            + '<div class="poem__title serif">%s</div>' % title
            + '<div class="poem__rule"></div>'
            + '<div class="poem__body serif">%s</div>' % ls
            + n + '</div>')

def daybar(T, theme="light"):
    return ('<div class="daybar"><span class="daybar__date">十月十一日 星期日</span></div>')

def today_has(T, theme="light"):
    card = poem_card_full(T, "静夜思", "李白", "唐", "五言绝句",
                          ["床前明月光，", "疑是地上霜。", "举头望明月，", "低头思故乡。"],
                          faved=True, with_detail=True)
    P = '<div class="page page--tab%s">' % dk(theme)
    return (P + daybar(T, theme) + card
            + '<button class="btn btn--block pick">%s</button>' % T["today_pick"] + '</div>')

def today_empty(T, theme="light"):
    P = '<div class="page page--tab%s">' % dk(theme)
    return (P
            + daybar(T, theme)
            + '<div class="welcome rise">'
            '<div class="welcome__seal serif">%s</div>' % T["today_seal"]
            + '<div class="welcome__desc">%s</div>' % T["today_welcome"]
            + '<button class="btn btn--block">%s</button>' % T["today_empty"]
            + '</div></div>')

def fh_page(T, theme="light"):
    res = poem_card_full(T, "鸟鸣涧", "王维", "唐", "五言绝句",
                         ["人闲桂花落，", "夜静春山空。", "月出惊山鸟，", "时鸣春涧中。"],
                         faved=False, with_detail=True)
    res = (res[:-len("</div>")]
           + '<div class="result__hit">含「月」 · 五言绝句</div></div>')
    P = '<div class="page page--tab%s">' % dk(theme)
    return (P
            + '<div class="hero hero--lead">'
              '<div class="hero__desc">%s</div></div>' % T["fh_desc"]
            + '<div class="card grab rise">'
              '<input class="grab__input serif" value="月">'
              '<div class="grab__quick">%s</div>'
              '<button class="btn btn--block">%s</button></div>'
            % (chips("月"), T["fh_play"])
            + res
            + '<button class="btn btn--block pick">%s</button>' % T["fh_change"]
            + '</div>')

def item(T, title, dynasty, author, typ, body, faved=False):
    return ('<div class="card item rise-item">'
            '<div class="item__head"><span class="item__title serif">%s</span>'
            '<span class="tag tag--accent">%s</span></div>'
            '<div class="item__meta">%s · %s</div>'
            '<div class="item__body serif">%s</div>'
            '<div class="item__foot"><div class="item__acts">'
            '<div class="item__act%s"><div class="ic %s item__act-ic%s"></div><span>%s</span></div>'
            '<div class="item__act"><div class="ic ic-copy item__act-ic"></div><span>%s</span></div>'
            '</div><div class="ic ic-chevron item__arrow"></div></div></div>'
            % (title, dynasty, author, typ, body,
               " item__act--on" if faved else "",
               "ic-heart-fill" if faved else "ic-heart",
               " ic--acc" if faved else "",
               T["fav_on"] if faved else T["fav_off"],
               T["copy"]))

def query_field(T, q="", theme="light"):
    return ('<div class="field rise">'
            '<div class="ic ic-search field__ic"></div>'
            '<input class="field__input" value="%s" placeholder="%s">'
            '%s'
            '<div class="field__go%s">%s</div></div>'
            % (q, T["query_ph"],
               '<div class="field__clear"><div class="ic ic-close field__clear-ic"></div></div>' if q else "",
               "" if q else " field__go--off", T["query_go"]))

def query_hot(T, theme="light"):
    hot = "".join('<div class="chip chip--wide">%s</div>' % w
                  for w in ["春", "月", "花", "李白", "杜甫", "唐", "山水", "思乡"])
    P = '<div class="page%s">' % dk(theme)
    return (P + query_field(T, "", theme)
            + '<div class="section-title section-title--gap">%s</div>' % T["query_try"]
            + '<div class="hot">%s</div></div>' % hot)

def query_result(T, theme="light"):
    P = '<div class="page%s">' % dk(theme)
    return (P + query_field(T, "月", theme)
            + '<div class="section-title section-title--gap">%s3%s</div>'
              % (T["query_count_prefix"], T["query_count_suffix"])
            + item(T, "静夜思", "唐", "李白", "五言绝句", "床前明月光，疑是地上霜。\n举头望明月，低头思故乡。", True)
            + item(T, "鸟鸣涧", "唐", "王维", "五言绝句", "人闲桂花落，夜静春山空。\n月出惊山鸟，时鸣春涧中。")
            + item(T, "水调歌头", "宋", "苏轼", "宋词", "明月几时有，把酒问青天。\n不知天上宫阙，今夕是何年。")
            + '</div>')

def mine_page(T, theme="light"):
    av = b64("assets/avatar-default-dark.png" if theme == "dark" else "assets/avatar-default.png")
    def row(ic, label, value, arrow=True, acc=False):
        return ('<div class="row"><div class="ic %s%s row__ic"></div>'
                '<span class="row__label">%s</span>'
                '<span class="row__value">%s</span>%s</div>'
                % (ic, " ic--acc" if acc else "", label, value,
                   '<div class="ic ic-chevron row__arrow"></div>' if arrow else ""))
    share_friend = ('<div class="row row__share"><div class="row__share-btn">'
                    '<div class="row__lead"><div class="ic ic-share row__ic"></div>'
                    '<span class="row__label">%s</span></div></div>'
                    '<div class="ic ic-chevron row__arrow"></div></div>' % T["share_friend"])
    P = '<div class="page page--tab%s">' % dk(theme)
    avatar = ('<div class="card me rise">'
              '<div class="me__avatar-btn"><img class="me__avatar" src="%s">'
              '<div class="me__badge"><div class="ic ic-camera me__badge-ic"></div></div></div>'
              '<div class="me__info"><div class="me__name">读诗的人</div>'
              '<div class="me__stat">%s3%s</div></div></div>'
              % (av, T["mine_faved_prefix"], T["mine_faved_suffix"]))
    return (P
            + avatar
            + '<div class="section-title section-title--gap">%s</div>' % T["sec_fav"]
            + '<div class="card group">%s</div>' % row("ic-heart-fill", T["mine_myfav"], "3 首", acc=True)
            + '<div class="section-title section-title--gap">%s</div>' % T["sec_settings"]
            + '<div class="card group">%s<div class="hr"></div>%s</div>'
              % (row("ic-moon", T["mine_appearance"], T["theme_auto"]),
                 row("ic-lang", T["mine_text"], T["lang_hans"]))
            + '<div class="section-title section-title--gap">%s</div>' % T["sec_share"]
            + '<div class="card group">%s<div class="hr"></div>%s</div>'
              % (share_friend, row("ic-image", T["share_moments"], T["moments_hint"]))
            + '<div class="section-title section-title--gap">%s</div>' % T["sec_about"]
            + '<div class="card group">%s</div>' % row("ic-info", T["about_version"], "1.0.0", arrow=False)
            + '<div class="about"><div class="about__brand serif">%s</div>'
              '<div class="about__desc">%s</div></div>' % (T["about_brand"], T["about_desc"])
            + '</div>')

def fav_page(T, theme="light"):
    P = '<div class="page%s">' % dk(theme)
    return (P
            + '<div class="section-title">%s3%s</div>'
              % (T["fav_count_prefix"], T["fav_count_suffix"])
            + item(T, "静夜思", "唐", "李白", "五言绝句", "床前明月光，疑是地上霜。\n举头望明月，低头思故乡。", True)
            + item(T, "鸟鸣涧", "唐", "王维", "五言绝句", "人闲桂花落，夜静春山空。\n月出惊山鸟，时鸣春涧中。", True)
            + '</div>')

def poem_detail(T, theme="light"):
    body = poem_card_full(T, "静夜思", "李白", "唐", "五言绝句",
                          ["床前明月光，", "疑是地上霜。", "举头望明月，", "低头思故乡。"],
                          note="五言绝句：四句，每句五字，讲究平仄对仗，是唐诗中最凝练的体裁之一。",
                          faved=True, with_detail=False)
    return '<div class="page%s">%s</div>' % (dk(theme), body)

CHROME = """
* { -webkit-tap-highlight-color: transparent; box-sizing:border-box; }
body { margin:0; background:#DCD6D3; display:flex; flex-wrap:wrap; align-items:flex-start;
       gap:28px 24px; padding:24px 24px 60px;
       font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif; }
.hd { width:100%; color:#3A3230; }
.hd__h { font-size:22px; font-weight:600; letter-spacing:1px; }
.hd__p { margin-top:6px; font-size:13px; color:#6E645F; }
.phone { flex:none; width:375px; height:812px; position:relative; overflow:hidden; background:var(--bg,#F9F6F5);
         display:flex; flex-direction:column; border-radius:14px; box-shadow:0 6px 28px rgba(36,29,27,.18); }
.tb { position:absolute !important; }
.ss { position:absolute !important; }
.nb { flex:none; }
.viewport { flex:1; overflow:hidden; display:flex; flex-direction:column; }
.viewport > .page { flex:1; overflow:hidden; background:var(--bg); }
input { border:none; outline:none; background:transparent; font-family:inherit; width:100%; }
button { border:none; font-family:inherit; cursor:pointer; }
.rise, .rise-item, .ss__mask, .ss__sheet { animation:none !important; }
"""

def html(screens, header=""):
    return ("<!DOCTYPE html><html><head><meta charset='utf-8'><title>一诗一令 · 界面预览</title><style>"
            + CHROME + icons + app + navbar_css + tab_css + sheet_css
            + "".join(pages_css.values()) + "</style></head><body>"
            + ('<div class="hd"><div class="hd__h">一诗一令古诗词 · 界面预览</div>'
               '<div class="hd__p">%s</div></div>' % header if header else "")
            + "".join(screens) + "</body></html>")

def build(lang):
    T = LANG[lang]
    return {
        "today": screen(T, navbar(T, T["tab_today"], "light", search=True), today_has(T, "light"), "today"),
        "fh": screen(T, navbar(T, T["tab_fh"], "light", search=True), fh_page(T, "light"), "fh"),
        "query_r": screen(T, navbar(T, T["nav_query"], "light", back=True), query_result(T, "light")),
        "query_h": screen(T, navbar(T, T["nav_query"], "light", back=True), query_hot(T, "light")),
        "mine": screen(T, navbar(T, T["tab_mine"], "light"), mine_page(T, "light"), "mine"),
        "fav": screen(T, navbar(T, T["nav_fav"], "light", back=True), fav_page(T, "light")),
        "today_d": screen(T, navbar(T, T["tab_today"], "dark", search=True), today_has(T, "dark"), "today", "dark"),
        "poem_d": screen(T, navbar(T, "静夜思", "dark", back=True), poem_detail(T, "dark"), None, "dark"),
        "fh_d": screen(T, navbar(T, T["tab_fh"], "dark", search=True), fh_page(T, "dark"), "fh", "dark"),
        "mine_d": screen(T, navbar(T, T["tab_mine"], "dark"), mine_page(T, "dark"), "mine", "dark"),
        "query_d": screen(T, navbar(T, T["nav_query"], "dark", back=True), query_result(T, "dark")),
        "sheet": screen(T, navbar(T, T["tab_today"], "light", search=True), today_has(T, "light"), "today",
                        overlay=share_sheet(T, "light", "静夜思", "李白")),
    }

# 主预览（简体）
S = build("hans")
os.makedirs(OUT, exist_ok=True)
for name, sc in S.items():
    open(os.path.join(OUT, "prev_%s.html" % name), "w", encoding="utf-8").write(html([sc]))
print("wrote prev_*.html (hans) x", len(S))

# 总览（浅色 + 深色，简体）
os.makedirs(DEST, exist_ok=True)
allscreens = list(S.values())
open(os.path.join(DEST, "index.html"), "w", encoding="utf-8").write(
    html(allscreens, "按 1rpx = 0.5px 等比例渲染｜前六屏浅色（今日 / 飞花令 / 查询结果 / 查询起始 / 我的 / 收藏），"
                     "后五屏深色（今日 / 详情 / 飞花令 / 我的 / 查询），最后一屏为分享面板"))
print("wrote", os.path.join(DEST, "index.html"))

# 繁體对照（只需验证「全部 UI 文案随语言切换」这一件事）
H = build("hant")
open(os.path.join(DEST, "index_hant.html"), "w", encoding="utf-8").write(
    html(list(H.values()), "繁體版：所有界面文案（按钮 / 标签 / tab / 导航栏 / 分享面板）均已切换"))
print("wrote", os.path.join(DEST, "index_hant.html"))

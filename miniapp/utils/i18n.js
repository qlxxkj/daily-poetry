// UI 多语言：简体 / 繁體。
//
// 诗词正文、标题、作者由 API 按 lang 返回（见 utils/api.js 的 lang()），
// 本模块只管「界面文案」——按钮、标签、提示、模态框、分享标题里的品牌词、
// tabBar、导航栏标题等所有写死在界面上的汉字。
//
// 用法：
//   - 页面 onShow 里调 i18n.sync(this) 把当前语言的词典写进 data.T；
//   - wxml 里用 {{T.xxx}} 取文案；
//   - 切语言走 i18n.setLang(lang)，它会广播给所有已注册页面/组件，各自 onLangChange 刷新。

const DICT = {
    "zh-Hans": {
        // tabBar / 导航栏标题
        tab_today: "一诗",
        nav_today: "今日一诗",
        tab_fh: "飞花令",
        tab_mine: "我的",
        nav_query: "查询",
        nav_fav: "我的收藏",

        // 今日
        today_seal: "诗",
        today_welcome: "从三十七万首里，随机取一首",
        today_pick_loading: "抽诗中…",
        today_pick: "再抽一首",
        today_empty_loading: "正在抽诗…",
        today_empty: "抽一首",
        aria_fav: "收藏",
        aria_copy: "复制",
        aria_share: "分享",
        aria_detail: "详情",

        // 我的
        mine_nick_ph: "点击设置昵称",
        mine_faved_prefix: "已收藏 ",
        mine_faved_suffix: " 首",
        mine_appearance: "外观",
        mine_text: "文字",
        sec_fav: "我的收藏",
        sec_settings: "我的设置",
        sec_share: "分享",
        sec_about: "关于",
        about_version: "版本",
        mine_myfav: "我收藏的诗词",
        mine_nofav: "还没有收藏",
        share_friend: "分享给好友",
        share_moments: "分享到朋友圈",
        moments_hint: "点右上角「···」",
        about_brand: "一诗一令",
        about_desc: "每日一诗 · 飞花令 · 全文查询",

        // 主题（外观选项）
        theme_auto: "跟随系统",
        theme_light: "浅色",
        theme_dark: "深色",

        // 语言（文字选项）
        lang_hans: "简体中文",
        lang_hant: "繁體中文",

        // 查询
        query_ph: "诗名 / 作者 / 朝代 / 诗句",
        query_go: "查询",
        query_try: "试试这些",
        query_count_prefix: "共 ",
        query_count_suffix: " 首",
        query_empty: "没有找到相关诗词，换个词试试",
        query_fail: "查询失败",
        fav_on: "已收藏",
        fav_off: "收藏",
        copy: "复制",

        // 飞花令
        fh_desc: "取一个字，觅一首含它的诗",
        fh_ph: "字",
        fh_play_loading: "寻觅中…",
        fh_play: "抽诗",
        fh_change: "换一首",
        fh_fail: "飞花令失败",

        // 详情
        poem_empty: "未找到诗文",

        // 收藏
        fav_count_prefix: "共 ",
        fav_count_suffix: " 首 · 存在本机",
        fav_empty_title: "还没有收藏的诗",
        fav_empty_hint: "在今日一诗、飞花令或查询结果里点 ♡ 就能收进来",
        fav_gotoday: "去看看今日一诗",

        // 分享面板
        ss_friend: "微信好友",
        ss_moments: "朋友圈",
        ss_copy: "复制全文",
        ss_cancel: "取消",

        // toast
        toast_faved: "已收藏",
        toast_unfav: "已取消收藏",
        toast_copied: "已复制",

        // 模态框
        modal_moments_title: "分享到朋友圈",
        modal_moments_content: "请点击右上角「···」，选择「分享到朋友圈」。\n（微信目前仅 Android 支持）",
        modal_ok: "知道了",

        // 错误兜底
        err_load: "加载失败",
        err_api: "API 地址未配置 (config.js)",
        err_net: "网络开小差啦，请再试一下",

        // 分享标题（品牌与标签）
        share_brand: "一诗一令古诗词",
        share_daily: "每日一诗",
        share_fh_tag: "飞花令",
        share_query_tag: "全文查询",
        share_q_prefix: "古诗词查询「",
        share_q_suffix: "」 · 一诗一令古诗词",
        share_fav_tag: "我的收藏",
    },

    "zh-Hant": {
        tab_today: "一詩",
        nav_today: "今日一詩",
        tab_fh: "飛花令",
        tab_mine: "我的",
        nav_query: "查詢",
        nav_fav: "我的收藏",

        today_seal: "詩",
        today_welcome: "從三十七萬首裡，隨機取一首",
        today_pick_loading: "抽詩中…",
        today_pick: "再抽一首",
        today_empty_loading: "正在抽詩…",
        today_empty: "抽一首",
        aria_fav: "收藏",
        aria_copy: "複製",
        aria_share: "分享",
        aria_detail: "詳情",

        mine_nick_ph: "點擊設置昵稱",
        mine_faved_prefix: "已收藏 ",
        mine_faved_suffix: " 首",
        mine_appearance: "外觀",
        mine_text: "文字",
        sec_fav: "我的收藏",
        sec_settings: "我的設置",
        sec_share: "分享",
        sec_about: "關於",
        about_version: "版本",
        mine_myfav: "我收藏的詩詞",
        mine_nofav: "還沒有收藏",
        share_friend: "分享給好友",
        share_moments: "分享到朋友圈",
        moments_hint: "點右上角「···」",
        about_brand: "一詩一令",
        about_desc: "每日一詩 · 飛花令 · 全文查詢",

        theme_auto: "跟隨系統",
        theme_light: "淺色",
        theme_dark: "深色",

        lang_hans: "簡體中文",
        lang_hant: "繁體中文",

        query_ph: "詩名 / 作者 / 朝代 / 詩句",
        query_go: "查詢",
        query_try: "試試這些",
        query_count_prefix: "共 ",
        query_count_suffix: " 首",
        query_empty: "沒有找到相關詩詞，換個詞試試",
        query_fail: "查詢失敗",
        fav_on: "已收藏",
        fav_off: "收藏",
        copy: "複製",

        fh_desc: "取一個字，覓一首含它的詩",
        fh_ph: "字",
        fh_play_loading: "尋覓中…",
        fh_play: "抽詩",
        fh_change: "換一首",
        fh_fail: "飛花令失敗",

        poem_empty: "未找到詩文",

        fav_count_prefix: "共 ",
        fav_count_suffix: " 首 · 存在本機",
        fav_empty_title: "還沒有收藏的詩",
        fav_empty_hint: "在今日一詩、飛花令或查詢結果裡點 ♡ 就能收進來",
        fav_gotoday: "去看看今日一詩",

        ss_friend: "微信好友",
        ss_moments: "朋友圈",
        ss_copy: "複製全文",
        ss_cancel: "取消",

        toast_faved: "已收藏",
        toast_unfav: "已取消收藏",
        toast_copied: "已複製",

        modal_moments_title: "分享到朋友圈",
        modal_moments_content: "請點擊右上角「···」，選擇「分享到朋友圈」。\n（微信目前僅 Android 支持）",
        modal_ok: "知道了",

        err_load: "加載失敗",
        err_api: "API 地址未配置 (config.js)",
        err_net: "網絡開小差了，請再試一下",

        share_brand: "一詩一令古詩詞",
        share_daily: "每日一詩",
        share_fh_tag: "飛花令",
        share_query_tag: "全文查詢",
        share_q_prefix: "古詩詞查詢「",
        share_q_suffix: "」 · 一詩一令古詩詞",
        share_fav_tag: "我的收藏",
    },
};

const FALLBACK = "zh-Hans";

function isLang(l) {
    return l === "zh-Hans" || l === "zh-Hant";
}

// 当前语言：优先全局态，回退到存储
function lang() {
    const g = getApp();
    const l = g && g.globalData && g.globalData.lang;
    return isLang(l) ? l : (wx.getStorageSync("poetry_lang") || FALLBACK);
}

function dict() {
    return DICT[lang()] || DICT[FALLBACK];
}

// 取某 key 的当前语言文案，缺失则回退简体，再缺失返回 key 本身（便于发现漏翻）
function t(key) {
    const d = dict();
    if (key in d) return d[key];
    if (key in DICT[FALLBACK]) return DICT[FALLBACK][key];
    return key;
}

// 不依赖全局态的安全取值：给组件 data 初始值用（组件 attached 时 getApp 未必就绪）
function fallback(key) {
    return key in DICT[FALLBACK] ? DICT[FALLBACK][key] : key;
}

// 把当前词典写进页面 data.T，并返回词典（调用方可在 js 里直接用）
function sync(page) {
    const l = lang();
    if (page && typeof page.setData === "function") {
        page.setData({ T: dict(), lang: l });
    }
    return dict();
}

// ---------- 变更广播（与 theme.js 同一思路）----------
let listeners = [];
function onChange(fn) {
    listeners.push(fn);
    return function off() {
        listeners = listeners.filter((f) => f !== fn);
    };
}

function fire() {
    const l = lang();
    listeners.forEach((fn) => {
        try {
            fn(l);
        } catch (e) {
            /* 单个页面报错不该影响其它 */
        }
    });
}

// 统一切换入口：写全局态 + 存储 + 广播。各页面/组件靠 onLangChange 各自刷新。
function setLang(l) {
    if (!isLang(l) || l === lang()) return;
    const g = getApp();
    if (g && g.globalData) g.globalData.lang = l;
    wx.setStorageSync("poetry_lang", l);
    fire();
}

module.exports = { DICT, lang, dict, t, fallback, sync, onChange, setLang };

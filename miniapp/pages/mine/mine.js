const fav = require("../../utils/fav.js");
const theme = require("../../utils/theme.js");
const i18n = require("../../utils/i18n.js");

const AVATAR = "/assets/avatar-default.png";
const AVATAR_DARK = "/assets/avatar-default-dark.png";
const K_AVATAR = "poetry_avatar";
const K_NICK = "poetry_nick";

Page({
    data: {
        theme: "light",
        themePref: "auto",
        themeLabel: "跟随系统",
        lang: "zh-Hans",
        langLabel: "简体中文",
        avatar: "",
        avatarSrc: AVATAR,
        nick: "",
        favCount: 0,
        version: "1.0.0",
        T: {},
    },

    onShow() {
        const t = theme.sync(this);
        const lang = i18n.lang();
        const saved = wx.getStorageSync(K_AVATAR) || "";
        const pref = theme.pref();
        this.setData({
            T: i18n.dict(),
            themePref: pref,
            themeLabel: i18n.t("theme_" + pref),
            lang,
            langLabel: lang === "zh-Hant" ? i18n.t("lang_hant") : i18n.t("lang_hans"),
            avatar: saved,
            avatarSrc: saved || (t === "dark" ? AVATAR_DARK : AVATAR),
            nick: wx.getStorageSync(K_NICK) || "",
            favCount: fav.count(),
        });
        const bar = typeof this.getTabBar === "function" ? this.getTabBar() : null;
        if (bar) bar.setData({ selected: 2, theme: t });

        // 注册语言变化监听：从本页切语言时实时刷新（也会收到自己的广播）
        if (this._langOff) this._langOff();
        this._langOff = i18n.onChange(() => this.onLangChange());
    },

    onHide() {
        if (this._langOff) { this._langOff(); this._langOff = null; }
    },
    onUnload() {
        if (this._langOff) { this._langOff(); this._langOff = null; }
    },

    // 语言切换：重写 T，并刷新随语言变化的标签（文字 / 外观）
    onLangChange() {
        const pref = theme.pref();
        const lang = i18n.lang();
        this.setData({
            T: i18n.dict(),
            lang,
            langLabel: lang === "zh-Hant" ? i18n.t("lang_hant") : i18n.t("lang_hans"),
            themeLabel: i18n.t("theme_" + pref),
        });
    },

    // ---------- 头像 / 昵称 ----------
    onChooseAvatar(e) {
        const tmp = e.detail && e.detail.avatarUrl;
        if (!tmp) return;
        const fs = wx.getFileSystemManager();
        const dir = wx.env.USER_DATA_PATH;
        const old = wx.getStorageSync(K_AVATAR) || "";
        // 头像存到本地文件目录：chooseAvatar 给的是临时路径，会被系统清掉
        const dest = `${dir}/avatar_${Date.now()}.png`;
        fs.saveFile({
            tempFilePath: tmp,
            filePath: dest,
            success: () => {
                if (old && old.indexOf(dir) === 0) {
                    try {
                        fs.unlink({ filePath: old });
                    } catch (err) {
                        /* 旧头像删不掉无所谓 */
                    }
                }
                wx.setStorageSync(K_AVATAR, dest);
                this.setData({ avatar: dest, avatarSrc: dest });
            },
            fail: () => {
                // 存不下就先用临时路径顶着，至少本次会话看得见
                wx.setStorageSync(K_AVATAR, tmp);
                this.setData({ avatar: tmp, avatarSrc: tmp });
            },
        });
    },

    onNickInput(e) {
        this.setData({ nick: e.detail.value });
    },

    onNickBlur(e) {
        const v = ((e.detail && e.detail.value) || "").trim();
        wx.setStorageSync(K_NICK, v);
        this.setData({ nick: v });
    },

    // ---------- 我的设置 ----------
    pickTheme() {
        wx.showActionSheet({
            itemList: [i18n.t("theme_auto"), i18n.t("theme_light"), i18n.t("theme_dark")],
            success: (r) => {
                const p = ["auto", "light", "dark"][r.tapIndex];
                if (!p) return;
                theme.set(p);
                const t = theme.current();
                this.setData({ theme: t, themePref: p, themeLabel: i18n.t("theme_" + p) });
                const bar = typeof this.getTabBar === "function" ? this.getTabBar() : null;
                if (bar) bar.setData({ selected: 2, theme: t });
            },
        });
    },

    pickLang() {
        const cur = i18n.lang();
        wx.showActionSheet({
            itemList: [i18n.t("lang_hans"), i18n.t("lang_hant")],
            success: (r) => {
                const l = r.tapIndex === 1 ? "zh-Hant" : "zh-Hans";
                if (l === cur) return;
                // 统一切换入口：写全局态 + 存储 + 广播，所有页面/组件都会刷新
                i18n.setLang(l);
            },
        });
    },

    goFav() {
        wx.navigateTo({ url: "/pages/favorites/favorites" });
    },

    onTimelineTip() {
        wx.showModal({
            title: i18n.t("modal_moments_title"),
            content: i18n.t("modal_moments_content"),
            showCancel: false,
            confirmText: i18n.t("modal_ok"),
        });
    },

    // ---------- 分享 ----------
    onShareAppMessage() {
        const T = i18n.dict();
        return {
            title: `${T.share_brand} · ${T.share_daily} · ${T.share_fh_tag} · ${T.share_query_tag}`,
            path: "/pages/today/today",
        };
    },
    onShareTimeline() {
        const T = i18n.dict();
        return { title: `${T.share_brand} · ${T.share_daily}`, query: "" };
    },
});

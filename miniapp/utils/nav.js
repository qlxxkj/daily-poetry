// 诗文详情跳转。
// wx.navigateTo 的 url 有长度上限,长诗(尤其带序的长篇)整首塞进 query 会被截断。
// 所以:短诗照旧带 p= 参数(便于微信搜一搜抓取详情页),长诗只走全局缓存。
// 两条路都通,poem.js 优先读缓存,查不到再退回 query。
const { packPoem } = require("./share.js");

function gotoPoem(p) {
    if (!p) return;
    getApp().globalData.pendingPoem = p;

    const q = packPoem(p);
    const url = q ? `/pages/poem/poem?p=${q}` : "/pages/poem/poem";
    wx.navigateTo({ url });
}

module.exports = { gotoPoem };

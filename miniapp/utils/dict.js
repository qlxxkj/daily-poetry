// 单字查释义：按需调用 zi.tools API，返回拼音 + 中文释义（MDBG 略說优先，kDefinition 兜底）
// 响应约 148KB，但只提取两个字段，前端只展示几十字节
function lookupChar(ch) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://zi.tools/api/zi/" + encodeURIComponent(ch),
      method: "GET",
      timeout: 5000,
      success(res) {
        if (res.statusCode !== 200) return reject(new Error("HTTP " + res.statusCode));
        const d = res.data || {};
        const yi = d.yi || {};
        const uh = (yi.unihan && yi.unihan.allver) || {};
        const kv = yi.kv || {};
        // 拼音：kMandarin 形如 ["6.1.0","18.0.0","jiǒng"]
        let py = "";
        for (const item of uh.kMandarin || []) {
          if (Array.isArray(item) && item[0] === "6.1.0" && item[2]) { py = item[2]; break; }
        }
        // 释义：MDBG 略說（kv.dict 里含"略說"的值）
        let mn = "";
        for (const v of Object.values(kv.dict || {})) {
          if (v && v.indexOf("略說") !== -1) {
            const m = v.match(/略說:\s*(.+?)(?=\s*\/ \d+ 字)/);
            if (m && m[1].trim()) { mn = m[1].trim(); break; }
          }
        }
        // 兜底：kDefinition（英文，无中文释义时）
        if (!mn) {
          const kd = (uh.kDefinition || [])[0];
          if (Array.isArray(kd) && kd[2]) mn = kd[2];
        }
        resolve({ py, mn });
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || "网络错误"));
      },
    });
  });
}

module.exports = { lookupChar };

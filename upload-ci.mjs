// miniprogram-ci 上传脚本 (方案 A: 推送 master → 上传开发版)
// 读 process.env.WX_CI_UPLOAD_KEY (GitHub Actions 注入), 从 project.config.json 读 appid。
// 上传成功只产生微信后台的「开发版」, 不自动提审/发布, 人工在后台操作。

import ci from "miniprogram-ci";
import { readFileSync } from "node:fs";

const appid = JSON.parse(readFileSync("miniapp/project.config.json", "utf8")).appid;
const key = process.env.WX_CI_UPLOAD_KEY;

if (!key) {
  console.error("缺少 WX_CI_UPLOAD_KEY (在 GitHub Secrets 里配置)");
  process.exit(1);
}

const projectPath = "miniapp";
const desc = `CI auto-upload ${new Date().toISOString()}`;

const project = new ci.Project({
  appid,
  type: "miniProgram",
  projectPath,
  privateKey: key,
  ignores: ["node_modules/**/*"],
});

await ci.upload({
  project,
  version: "0.0.0",
  desc,
  robot: 1,
  onProgressUpdate: console.log,
});

console.log("开发版已上传到微信后台 (appid=%s), 请在后台选为体验版或提审", appid);

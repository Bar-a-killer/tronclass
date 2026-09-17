import Tronclass from "../dist/index.js";
import Rollcall from "../dist/rollcall.js";
import captcha from "../ocr/js/ocr.js";
import { discordNotify } from "./notify.js";

import fs from "fs";
import path from "path";
import YAML from "yaml";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = YAML.parse(
  fs.readFileSync(path.resolve(__dirname, "yamls/config.yaml"), "utf8")
);
const username = config.tron.TRON_USER;
const password = config.tron.TRON_PASS;
const baseUrl = config.tron.TRON_BASE_URL;
const intervalMs = config.tron.TRON_INTERVAL;

if (!username)
  throw new Error("Please set the TRON_USER environment variable.");
if (!password)
  throw new Error("Please set the TRON_PASS environment variable.");
if (!baseUrl)
  throw new Error("Please set the TRON_BASE_URL environment variable.");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const tronclass = new Tronclass();
  tronclass.setBaseUrl(baseUrl);

  async function performLogin() {
    for (let i = 0; i < 3; i++) {
      const loginResult = await tronclass.login(username, password, captcha);
      if (loginResult.success) {
        console.log("Login succeeded:", loginResult.message);
        await discordNotify(`${username} Login succeeded: ${loginResult.message}`).catch(console.error);
        return true;
      }
      console.error(`Login attempt ${i + 1} failed:`, loginResult.message);
      await discordNotify(`${username} Login attempt ${i + 1} failed: ${loginResult.message}`).catch(console.error);
      if (i < 2) {
        console.log("Retrying login in 3 seconds...");
        await sleep(3000);
      }
    }
    return false;
  }

  const loginOk = await performLogin();
  if (!loginOk || !tronclass.IsloggedIn()) {
    console.error("Failed to log in after multiple attempts. Exiting.");
    await discordNotify(`${username} Failed to log in after multiple attempts. Exiting.`).catch(console.error);
    return;
  }

  const rollcall = new Rollcall(tronclass);

  (async function poll() {
    let cnt = 0;
    let consecutiveErrors = 0;
    for (;;) {
      try {
        await rollcall.checkRollcall(cnt++);
        consecutiveErrors = 0;
        console.log("Finished checking roll calls.");
      } catch (err) {
        consecutiveErrors++;
        console.error("Error checking roll calls:", err);
        // 連續發生 2 次以上錯誤（通常是 Cookie / Session 過期），嘗試重新登入恢復
        if (consecutiveErrors >= 2) {
          console.warn("⚠️ 偵測到連線異常（可能 Session 已過期），嘗試自動重新登入...");
          await discordNotify(`${username} 偵測到連線異常，正在嘗試重新登入...`).catch(console.error);
          const ok = await performLogin();
          if (ok) {
            consecutiveErrors = 0;
            console.log("自動重新登入成功！繼續巡檢點名。");
          } else {
            console.error("自動重新登入失敗，等待下一輪重試。");
          }
        } else {
          await discordNotify(`${username} Error checking roll calls: ${err?.message || err}`).catch(console.error);
        }
      }
      await sleep(intervalMs || 5000);
    }
  })();
}

main();


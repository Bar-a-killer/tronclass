import Tronclass from "../dist/index.js";
import Rollcall from "../dist/rollcall.js";
import captcha from "../ocr/js/ocr.js";
import { configureNotify, discordNotify } from "./notify.js";
import { findUser, mergeBotConfig, writeJsonAtomic } from "./lib/store.js";
import { userStatusFile } from "./lib/paths.js";

// 多人模式專用：由後端以 `pm2 start bot.js -- <帳號>` 啟動，每位使用者一個獨立程序
// (單人模式仍使用 main.js + scheduler.js，讀取 config.yaml)
const account = process.argv[2];
if (!account) throw new Error("Usage: node maincode/bot.js <username>");

const user = findUser(account);
if (!user) throw new Error(`User "${account}" not found in maincode/data/users.json`);

const config = mergeBotConfig(user.config);
const username = config.tron.TRON_USER;
const password = config.tron.TRON_PASS;
const baseUrl = config.tron.TRON_BASE_URL;
const intervalMs = config.tron.TRON_INTERVAL;

if (!username) throw new Error("Please set the Tronclass account in the web UI.");
if (!password) throw new Error("Please set the Tronclass password in the web UI.");
if (!baseUrl) throw new Error("Please set the Tronclass base URL in the web UI.");

// 狀態檔供管理後台顯示每位使用者的即時狀況
const status = { pid: process.pid, phase: "starting", checks: 0, startedAt: new Date().toISOString() };
function setStatus(patch) {
  Object.assign(status, patch, { updatedAt: new Date().toISOString() });
  try {
    writeJsonAtomic(userStatusFile(account), status);
  } catch (err) {
    console.error("Failed to write status file:", err.message);
  }
}
setStatus({});

// 每次讀取最新的 webhook，使用者在網頁上修改後不用重啟就會生效
configureNotify({
  getWebhookUrl: () => findUser(account)?.config?.webhook?.webhook_url || "",
  onMessage: (message) => setStatus({ lastEvent: { message, at: new Date().toISOString() } }),
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const LOGIN_RETRY_MS = 5 * 60 * 1000;

async function main() {
  const tronclass = new Tronclass();
  tronclass.setBaseUrl(baseUrl);

  async function performLogin() {
    setStatus({ phase: "logging-in" });
    for (let i = 0; i < 3; i++) {
      const loginResult = await tronclass.login(username, password, captcha);
      if (loginResult.success) {
        console.log("Login succeeded:", loginResult.message);
        setStatus({ phase: "running", lastLoginAt: new Date().toISOString() });
        await discordNotify(`${username} Login succeeded: ${loginResult.message}`).catch(console.error);
        return true;
      }
      console.error(`Login attempt ${i + 1} failed:`, loginResult.message);
      setStatus({ lastError: { message: `登入失敗: ${loginResult.message}`, at: new Date().toISOString() } });
      await discordNotify(`${username} Login attempt ${i + 1} failed: ${loginResult.message}`).catch(console.error);
      if (i < 2) {
        console.log("Retrying login in 3 seconds...");
        await sleep(3000);
      }
    }
    setStatus({ phase: "login-failed" });
    return false;
  }

  // 登入失敗時不結束程序（否則 pm2 會立刻重啟造成無限重試），改為隔一段時間再試
  while (!(await performLogin()) || !tronclass.IsloggedIn()) {
    console.error(`Failed to log in after multiple attempts. Retrying in ${LOGIN_RETRY_MS / 60000} minutes.`);
    await discordNotify(`${username} 多次登入失敗，${LOGIN_RETRY_MS / 60000} 分鐘後重試`).catch(console.error);
    await sleep(LOGIN_RETRY_MS);
  }

  const rollcall = new Rollcall(tronclass);

  let cnt = 0;
  let consecutiveErrors = 0;
  for (;;) {
    try {
      await rollcall.checkRollcall(cnt++);
      consecutiveErrors = 0;
      setStatus({ phase: "running", checks: cnt, lastCheckAt: new Date().toISOString() });
      console.log("Finished checking roll calls.");
    } catch (err) {
      consecutiveErrors++;
      console.error("Error checking roll calls:", err);
      setStatus({ lastError: { message: err?.message || String(err), at: new Date().toISOString() } });
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
}

main();

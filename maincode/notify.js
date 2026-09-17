import https from "https";
import { URL } from "url";
import fs from "fs";
import path from "path";
import YAML from "yaml";
import { fileURLToPath } from "url";

// === 取得目前檔案所在路徑 ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 單人模式：動態取得 config.yaml 中最新的 Webhook URL
 */
function getLegacyWebhookUrl() {
  try {
    const yamlPath = path.resolve(__dirname, "yamls/config.yaml");
    if (!fs.existsSync(yamlPath)) return "";
    const config = YAML.parse(fs.readFileSync(yamlPath, "utf8"));
    return config?.webhook?.webhook_url || "";
  } catch (err) {
    console.warn("⚠️ 無法讀取 config.yaml 中的 webhook：", err.message);
    return "";
  }
}

// 預設沿用單人模式讀 config.yaml；多人模式的 bot.js 會呼叫 configureNotify 改用該使用者的 webhook，
// 後端伺服器則直接呼叫 sendDiscord 並指定 webhook
let resolveWebhookUrl = getLegacyWebhookUrl;
let onNotify = () => {};

export function configureNotify({ getWebhookUrl, onMessage } = {}) {
  if (getWebhookUrl) resolveWebhookUrl = getWebhookUrl;
  if (onMessage) onNotify = onMessage;
}

/**
 * 發送 Discord Webhook 訊息到目前設定的使用者 webhook
 * @param {string} content - 訊息文字
 * @param {object} [options] - 額外選項
 */
export async function discordNotify(content, options = {}) {
  try {
    onNotify(content);
  } catch {
    // 狀態紀錄失敗不影響通知
  }
  return sendDiscord(resolveWebhookUrl(), content, options);
}

/**
 * 發送 Discord Webhook 訊息
 * @param {string} webhookUrl - Webhook 網址，空值則略過
 * @param {string} content - 訊息文字
 * @param {object} [options] - 額外選項
 */
export async function sendDiscord(webhookUrl, content, options = {}) {
  if (!webhookUrl) {
    console.warn("⚠️ 未設定 webhook URL，跳過 Discord 通知。");
    return { status: 0, body: "Webhook URL not configured" };
  }

  const { username = "Tronclass Bot 🤖", embeds = [] } = options;
  const data = JSON.stringify({ content, username, embeds });

  try {
    const url = new URL(webhookUrl);
    const reqOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    return await new Promise((resolve) => {
      const req = https.request(reqOptions, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, body });
          } else {
            console.warn(`⚠️ Discord Webhook 回應狀態碼: ${res.statusCode}，內容: ${body}`);
            resolve({ status: res.statusCode, body });
          }
        });
      });

      req.on("error", (err) => {
        console.error("⚠️ Discord Webhook 請求發生網路錯誤:", err.message);
        resolve({ status: -1, error: err.message });
      });

      req.write(data);
      req.end();
    });
  } catch (err) {
    console.error("⚠️ Discord Webhook 處理失敗:", err.message);
    return { status: -1, error: err.message };
  }
}


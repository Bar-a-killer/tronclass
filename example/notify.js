import https from "https";
import { URL } from "url";
import fs from "fs";
import path from "path";
import YAML from "yaml";
import { fileURLToPath } from "url";

// === 取得目前檔案所在路徑 ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === 讀取 config.yaml ===
let WEBHOOK_URL = "";
try {
  const yamlPath = path.resolve(__dirname, "config.yaml");
  const config = YAML.parse(fs.readFileSync(yamlPath, "utf8"));
  WEBHOOK_URL = config.webhook || "";
  if (!WEBHOOK_URL) console.warn("⚠️ config.yaml 找不到 webhook 欄位。");
} catch (err) {
  console.warn("⚠️ 無法讀取 config.yaml：", err.message);
}

/**
 * 發送 Discord Webhook 訊息
 * @param {string} content - 訊息文字
 * @param {object} [options] - 額外選項
 */
export async function discordNotify(content, options = {}) {
  if (!WEBHOOK_URL) throw new Error("未設定 webhook URL。請在 config.yaml 中設定。");

  const { username = "Tronclass Bot 🤖", embeds = [] } = options;
  const data = JSON.stringify({ content, username, embeds });

  const url = new URL(WEBHOOK_URL);

  const reqOptions = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(reqOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

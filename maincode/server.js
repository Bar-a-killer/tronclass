import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import YAML from 'yaml';

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = 'http://localhost:5173';

// --- 修正後的檔案路徑設定 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 假設設定檔位於 /yamls/config.yaml (根據您的專案結構)
const CONFIG_FILE_PATH = join(__dirname, 'yamls', 'config.yaml'); 

app.use(express.json());
// 允許跨域請求 (CORS)
app.use(cors());

console.log(`設定檔預期路徑: ${CONFIG_FILE_PATH}`);

/**
 * 讀取 config.yaml 檔案並將 YAML 轉換為 JSON
 */
app.get('/api/get-config', async (req, res) => {
    try {
        const yamlContent = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
        const configJson = YAML.parse(yamlContent);
        res.json({ status: 'success', data: configJson });
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn("Config file not found. Returning default.");
            // 如果找不到檔案，返回預設結構
            return res.json({ status: 'success', data: {
                tron: { TRON_USER: '', TRON_PASS: '', TRON_BASE_URL: 'https://tronclass.ntou.edu.tw', TRON_INTERVAL: 5000 },
                scheduler: { START_HOUR: 6, STOP_HOUR: 18, CHECK_INTERVAL: 15 },
                webhook: { webhook_url: '' }
            }});
        }
        console.error('Error reading config:', error);
        res.status(500).json({ status: 'error', message: '無法讀取設定檔' });
    }
});

/**
 * 接收 JSON 設定，轉換為 YAML，並寫入 config.yaml
 */
app.post('/api/save-config', async (req, res) => {
    const newConfigJson = req.body.config;
    if (!newConfigJson) {
        return res.status(400).json({ status: 'error', message: '缺少配置資料' });
    }

    try {
        const yamlContent = YAML.stringify(newConfigJson);
        await fs.writeFile(CONFIG_FILE_PATH, yamlContent, 'utf-8');
        res.json({ status: 'success', message: `設定檔已成功寫入 ${CONFIG_FILE_PATH}` });
    } catch (error) {
        console.error('Error writing config:', error);
        res.status(500).json({ status: 'error', message: '無法寫入設定檔' });
    }
});

// 白名單限制允許執行的 NPM 腳本
const ALLOWED_SCRIPTS = new Set(['start', 'stop', 'delete', 'list', 'logs', 'reload']);

/**
 * 執行 NPM 腳本 (pm2 命令)
 */
app.post('/api/run-script', (req, res) => {
    const { scriptName } = req.body;
    if (!scriptName) {
        return res.status(400).json({ status: 'error', output: '缺少腳本名稱' });
    }
    
    // 安全檢查：嚴格限制允許執行的腳本名稱
    if (!ALLOWED_SCRIPTS.has(scriptName)) {
        return res.status(403).json({ status: 'error', output: `未授權執行的腳本名稱: ${scriptName}` });
    }
    
    const command = `npm run ${scriptName}`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`執行錯誤: ${error}`);
            return res.json({ status: 'error', output: stderr || error.message }); 
        }
        res.json({ status: 'success', output: stdout });
    });
});

app.listen(PORT, () => {
    console.log(`後端服務運行於 http://localhost:${PORT}`);
    if (process.env.AUTO_START_UI === 'true') {
        exec(`npm run ui`, (err) => {
            if (err) console.log(`請手動開啟瀏覽器至: ${FRONTEND_URL}`);
        });
    }
});

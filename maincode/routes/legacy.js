import express from 'express';
import { exec } from 'child_process';
import fs from 'fs/promises';
import YAML from 'yaml';
import { CONFIG_FILE_PATH } from '../lib/paths.js';

// 單人模式 (預設)：與原本的版本相同，不需登入，設定存於 config.yaml，
// 點名主程式 (main.js) 與排程器 (scheduler.js) 透過 npm scripts 以 pm2 管理。
const router = express.Router();

router.get('/auth/state', (_req, res) => {
    res.json({ status: 'success', mode: 'single' });
});

/**
 * 讀取 config.yaml 檔案並將 YAML 轉換為 JSON
 */
router.get('/get-config', async (req, res) => {
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
router.post('/save-config', async (req, res) => {
    const newConfigJson = req.body.config;
    if (!newConfigJson) {
        return res.status(400).json({ status: 'error', message: '缺少配置資料' });
    }

    try {
        // 與現有設定檔合併寫入，避免蓋掉前端表單不認得的欄位（例如 server.PORT）
        let existingConfig = {};
        try {
            const existingYaml = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
            existingConfig = YAML.parse(existingYaml) || {};
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        const mergedConfig = { ...existingConfig, ...newConfigJson };
        const yamlContent = YAML.stringify(mergedConfig);
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
router.post('/run-script', (req, res) => {
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

export default function mountSingleUser(app) {
    app.use('/api', router);
    return {};
}

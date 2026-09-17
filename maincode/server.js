import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { join } from 'path';
import fsSync from 'fs';
import YAML from 'yaml';
import { CONFIG_FILE_PATH, ROOT_DIR } from './lib/paths.js';

const app = express();
const FRONTEND_URL = 'http://localhost:5173';

function readServerConfig() {
    try {
        return YAML.parse(fsSync.readFileSync(CONFIG_FILE_PATH, 'utf-8'))?.server || {};
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('讀取 config.yaml 的 server 設定失敗:', error);
        return {};
    }
}

const serverConfig = readServerConfig();

// 啟動時讀取 config.yaml 的 server.PORT；env PORT 優先權最高，沒設定則預設 3000
const PORT = process.env.PORT || serverConfig.PORT || 3000;

// 運行模式：single (預設，單人自架、不需登入) 或 multi (多人登入 + 管理後台)
// env TRONCLASS_MODE 優先，其次是 config.yaml 的 server.MODE
const MODE = String(process.env.TRONCLASS_MODE || serverConfig.MODE || 'single').toLowerCase();
if (!['single', 'multi'].includes(MODE)) {
    console.error(`未知的運行模式 "${MODE}"，請設定為 single 或 multi`);
    process.exit(1);
}

app.use(express.json({ limit: '100kb' }));

if (MODE === 'single') {
    // 允許跨域請求 (CORS)，維持單人版原本的行為
    app.use(cors());
} else if (process.env.TRUST_PROXY) {
    // 放在反向代理 (nginx 等) 後面時設定 TRUST_PROXY=1，才能取得真實 IP 與 https 狀態
    app.set('trust proxy', process.env.TRUST_PROXY);
}

// 提供前端打包後的靜態檔案 (client/dist)，讓前端與後端同源，API 呼叫不需要知道 port
const CLIENT_DIST_PATH = join(ROOT_DIR, 'client', 'dist');
app.use(express.static(CLIENT_DIST_PATH));

console.log(`設定檔預期路徑: ${CONFIG_FILE_PATH}`);
console.log(`運行模式: ${MODE === 'multi' ? '多人 (multi)' : '單人 (single)'}`);

// 依模式動態載入，單人模式不會載入任何多人版的模組
const { default: mount } = MODE === 'multi'
    ? await import('./routes/multi.js')
    : await import('./routes/legacy.js');
const { onListen } = mount(app);

app.use('/api', (_req, res) => res.status(404).json({ status: 'error', message: '找不到 API' }));

// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
    console.error('API 錯誤:', error);
    res.status(500).json({ status: 'error', message: error.message || '伺服器錯誤' });
});

app.listen(PORT, () => {
    console.log(`後端服務運行於 http://localhost:${PORT}`);
    onListen?.();
    if (process.env.AUTO_START_UI === 'true') {
        exec(`npm run ui`, (err) => {
            if (err) console.log(`請手動開啟瀏覽器至: ${FRONTEND_URL}`);
        });
    }
});

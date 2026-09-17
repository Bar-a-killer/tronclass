import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE_PATH = join(__dirname, '..', 'maincode', 'yamls', 'config.yaml');

// 開發模式下讀取後端的 config.yaml，把 /api 轉發到同一個 port，維持與正式環境相同的相對路徑呼叫方式
function resolveApiPort() {
    if (process.env.PORT) return process.env.PORT;
    try {
        const yamlContent = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
        const configJson = YAML.parse(yamlContent);
        if (configJson?.server?.PORT) return configJson.server.PORT;
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('讀取 config.yaml 的 PORT 設定失敗:', error);
    }
    return 3000;
}

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: `http://localhost:${resolveApiPort()}`,
                changeOrigin: true,
            },
        },
    },
});

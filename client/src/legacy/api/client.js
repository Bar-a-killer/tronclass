// 相對路徑:正式環境由後端同源提供靜態檔案;開發模式則透過 vite.config.js 的 proxy 轉發到後端
export const API_BASE_URL = '';

export async function getConfig() {
  const response = await fetch(`${API_BASE_URL}/api/get-config`);
  if (!response.ok) throw new Error('API request failed');
  const result = await response.json();
  return result.data;
}

export async function saveConfig(config) {
  const response = await fetch(`${API_BASE_URL}/api/save-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || '儲存 API 錯誤');
  return result;
}

// 注意:{status:'error'} 是這個 API 的合法回應內容(例如白名單拒絕、pm2 執行失敗),
// 不應被當成網路例外拋出,而是交給呼叫端當作一筆日誌顯示
export async function runScript(scriptName) {
  const response = await fetch(`${API_BASE_URL}/api/run-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptName }),
  });
  return response.json();
}

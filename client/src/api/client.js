// 相對路徑:正式環境由後端同源提供靜態檔案;開發模式則透過 vite.config.js 的 proxy 轉發到後端
export const API_BASE_URL = '';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// 任何 API 回應 401 時通知 useAuth 把畫面切回登入頁
export const UNAUTHORIZED_EVENT = 'tronclass:unauthorized';

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let result = null;
  try {
    result = await response.json();
  } catch {
    // 非 JSON 回應(例如後端沒啟動時 vite proxy 的錯誤頁)
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(result?.message || `API 錯誤 (${response.status})`, response.status);
  }
  return result;
}

const enc = encodeURIComponent;

export const auth = {
  state: () => request('/auth/state'),
  setup: (username, password) => request('/auth/setup', { method: 'POST', body: { username, password } }),
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/auth/logout', { method: 'POST', body: {} }),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/password', { method: 'POST', body: { currentPassword, newPassword } }),
};

export const me = {
  getConfig: async () => (await request('/me/config')).data,
  saveConfig: async (config) => (await request('/me/config', { method: 'PUT', body: { config } })).data,
  getBot: async () => (await request('/me/bot')).data,
  botAction: async (action) => (await request(`/me/bot/${action}`, { method: 'POST', body: {} })).data,
  getLogs: async () => (await request('/me/bot/logs')).data,
};

export const admin = {
  listUsers: async () => (await request('/admin/users')).data,
  createUser: async (user) => (await request('/admin/users', { method: 'POST', body: user })).data,
  updateUser: async (username, patch) =>
    (await request(`/admin/users/${enc(username)}`, { method: 'PATCH', body: patch })).data,
  deleteUser: (username) => request(`/admin/users/${enc(username)}`, { method: 'DELETE' }),
  botAction: async (username, action) =>
    (await request(`/admin/users/${enc(username)}/bot/${action}`, { method: 'POST', body: {} })).data,
  getLogs: async (username) => (await request(`/admin/users/${enc(username)}/logs`)).data,
  clearLogs: (username) => request(`/admin/users/${enc(username)}/logs`, { method: 'DELETE' }),
  audit: async ({ user = '', action = '', limit = 300 } = {}) =>
    (await request(`/admin/audit?limit=${limit}&user=${enc(user)}&action=${enc(action)}`)).data,
};

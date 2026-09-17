import fs from 'fs';
import { dirname } from 'path';
import { USERS_FILE } from './paths.js';

export const DEFAULT_BOT_CONFIG = {
  tron: { TRON_USER: '', TRON_PASS: '', TRON_BASE_URL: 'https://tronclass.ntou.edu.tw', TRON_INTERVAL: 5000 },
  scheduler: { START_HOUR: 8, STOP_HOUR: 18 },
  webhook: { webhook_url: '' },
};

export function writeJsonAtomic(file, data) {
  fs.mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmp, file);
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

// users.json 只由後端伺服器寫入；點名程式 (main.js) 只讀取自己的那一筆
export function loadUsers() {
  return readJson(USERS_FILE, { users: [] }).users;
}

export function saveUsers(users) {
  writeJsonAtomic(USERS_FILE, { users });
}

export function findUser(username) {
  return loadUsers().find((u) => u.username === username) || null;
}

export function updateUser(username, mutate) {
  const users = loadUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return null;
  mutate(user);
  saveUsers(users);
  return user;
}

export function mergeBotConfig(base = {}, patch = {}) {
  const result = {};
  // 只保留認得的欄位，例如舊版 config.yaml 的 scheduler.CHECK_INTERVAL 會被丟掉
  for (const [section, defaults] of Object.entries(DEFAULT_BOT_CONFIG)) {
    const merged = { ...defaults, ...(base[section] || {}), ...(patch[section] || {}) };
    result[section] = Object.fromEntries(Object.keys(defaults).map((key) => [key, merged[key]]));
  }
  return result;
}

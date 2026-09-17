import fs from 'fs';
import { dirname } from 'path';
import { AUDIT_FILE } from './paths.js';

// 稽核紀錄：一行一筆 JSON，記錄登入、設定變更、程序啟停等操作
export function audit(req, action, detail = {}) {
  const entry = {
    at: new Date().toISOString(),
    actor: req?.user?.username ?? detail.actor ?? null,
    ip: req?.ip ?? null,
    action,
    ...detail,
  };
  try {
    fs.mkdirSync(dirname(AUDIT_FILE), { recursive: true });
    fs.appendFileSync(AUDIT_FILE, `${JSON.stringify(entry)}\n`, { encoding: 'utf-8', mode: 0o600 });
  } catch (error) {
    console.error('寫入稽核紀錄失敗:', error.message);
  }
}

export function readTail(file, maxBytes) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
  try {
    const { size } = fs.fstatSync(fd);
    const length = Math.min(size, maxBytes);
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, size - length);
    let text = buffer.toString('utf-8');
    // 從中間截斷時丟掉第一行殘缺內容
    if (length < size) text = text.slice(text.indexOf('\n') + 1);
    return text;
  } finally {
    fs.closeSync(fd);
  }
}

export function readAudit({ limit = 200, username, action } = {}) {
  const lines = readTail(AUDIT_FILE, 2 * 1024 * 1024).split('\n').filter(Boolean);
  const entries = [];
  for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (username && entry.actor !== username && entry.target !== username) continue;
    if (action && !entry.action.startsWith(action)) continue;
    entries.push(entry);
  }
  return entries;
}

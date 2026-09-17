import fs from 'fs';
import pm2 from 'pm2';
import { BOT_SCRIPT, DATA_DIR, userDir, userLogFile, userStatusFile } from './paths.js';
import { loadUsers, readJson } from './store.js';
import { readTail } from './audit.js';
import { sendDiscord } from '../notify.js';

export const processName = (username) => `tc-${username}`;

const call = (method, ...args) =>
  new Promise((resolve, reject) => {
    pm2[method](...args, (err, result) => (err ? reject(err) : resolve(result)));
  });

let connecting = null;
function connect() {
  if (!connecting) {
    connecting = call('connect').catch((err) => {
      connecting = null;
      throw err;
    });
  }
  return connecting;
}

async function listProcesses() {
  await connect();
  const list = await call('list');
  return new Map(list.map((p) => [p.name, p]));
}

function describeProcess(proc) {
  if (!proc) return { status: 'missing' };
  const env = proc.pm2_env || {};
  return {
    status: env.status,
    pid: proc.pid || null,
    startedAt: env.pm_uptime || null,
    restarts: env.restart_time ?? 0,
    cpu: proc.monit?.cpu ?? null,
    memory: proc.monit?.memory ?? null,
  };
}

export function isInSchedule(scheduler, now = new Date()) {
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const hour = now.getHours();
  const start = Number(scheduler?.START_HOUR);
  const stop = Number(scheduler?.STOP_HOUR);
  if (!Number.isInteger(start) || !Number.isInteger(stop) || start === stop) return false;
  return start < stop ? hour >= start && hour < stop : hour >= start || hour < stop;
}

// 排程是否應該讓這位使用者的點名程式運行
function shouldRun(user, now) {
  return Boolean(user.enabled && !user.disabled && user.config?.tron?.TRON_USER && isInSchedule(user.config.scheduler, now));
}

function buildStatus(user, proc, now = new Date()) {
  const runtime = readJson(userStatusFile(user.username), null);
  const processInfo = describeProcess(proc);
  // 狀態檔只在程序運行時才有意義，避免顯示上一次運行殘留的「運行中」
  const fresh = runtime && processInfo.status === 'online' && runtime.pid === processInfo.pid;
  return {
    enabled: Boolean(user.enabled),
    inSchedule: isInSchedule(user.config?.scheduler, now),
    shouldRun: shouldRun(user, now),
    configured: Boolean(user.config?.tron?.TRON_USER && user.config?.tron?.TRON_PASS),
    process: processInfo,
    runtime: runtime && { ...runtime, phase: fresh ? runtime.phase : 'stopped' },
  };
}

export async function getStatus(user) {
  const procs = await listProcesses();
  return buildStatus(user, procs.get(processName(user.username)));
}

export async function getAllStatuses(users) {
  const procs = await listProcesses();
  return new Map(users.map((u) => [u.username, buildStatus(u, procs.get(processName(u.username)))]));
}

async function startProcess(username, procs) {
  const name = processName(username);
  const existing = procs.get(name);
  if (existing) {
    await call('restart', name);
    return;
  }
  fs.mkdirSync(userDir(username), { recursive: true });
  await call('start', {
    script: BOT_SCRIPT,
    name,
    args: [username],
    cwd: userDir(username),
    output: userLogFile(username),
    error: userLogFile(username),
    time: true,
    autorestart: true,
    restart_delay: 10_000,
    // pm2 daemon 不會繼承後端的環境變數，資料目錄要明確傳給點名程式
    env: { TRONCLASS_DATA_DIR: DATA_DIR },
  });
}

async function stopProcess(username, procs) {
  const proc = procs.get(processName(username));
  if (proc && proc.pm2_env?.status !== 'stopped') await call('stop', processName(username));
}

export async function restartBot(username) {
  await startProcess(username, await listProcesses());
}

export async function stopBot(username) {
  await stopProcess(username, await listProcesses());
}

export async function deleteBot(username) {
  const procs = await listProcesses();
  if (procs.has(processName(username))) await call('delete', processName(username));
}

export async function readBotLog(username, maxBytes = 256 * 1024) {
  return readTail(userLogFile(username), maxBytes);
}

export function clearBotLog(username) {
  try {
    fs.truncateSync(userLogFile(username), 0);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

// ---------------------------------------------------------------------------
// 排程器：每分鐘比對每位使用者「應該運行」與 pm2 實際狀態，不一致就啟動 / 停止。
// 取代原本單人版的 scheduler.js。
// ---------------------------------------------------------------------------
const TICK_MS = 60 * 1000;
let ticking = false;

export async function reconcile() {
  if (ticking) return;
  ticking = true;
  try {
    const now = new Date();
    const procs = await listProcesses();
    for (const user of loadUsers()) {
      const proc = procs.get(processName(user.username));
      const online = ['online', 'launching'].includes(proc?.pm2_env?.status);
      const want = shouldRun(user, now);
      if (want === online) continue;
      const time = now.toLocaleTimeString('zh-TW', { hour12: false });
      const webhook = user.config?.webhook?.webhook_url;
      try {
        if (want) {
          console.log(`[排程] ${time} 啟動 ${user.username}`);
          await startProcess(user.username, procs);
          sendDiscord(webhook, `[${time}] 🟢 開始自動點名`).catch(() => {});
        } else if (proc) {
          console.log(`[排程] ${time} 停止 ${user.username}`);
          await stopProcess(user.username, procs);
          sendDiscord(webhook, `[${time}] 🔴 停止自動點名`).catch(() => {});
        }
      } catch (error) {
        console.error(`[排程] ${user.username} 切換失敗:`, error.message);
      }
    }
  } catch (error) {
    console.error('[排程] 無法連線到 pm2:', error.message);
  } finally {
    ticking = false;
  }
}

export function startScheduler() {
  reconcile();
  setInterval(reconcile, TICK_MS).unref();
}

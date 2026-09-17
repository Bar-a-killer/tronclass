import express from 'express';
import fs from 'fs';
import YAML from 'yaml';
import { CONFIG_FILE_PATH, USERNAME_PATTERN } from '../lib/paths.js';
import { DEFAULT_BOT_CONFIG, findUser, loadUsers, mergeBotConfig, saveUsers, updateUser } from '../lib/store.js';
import {
  attachUser,
  burnPasswordCheck,
  clearFailures,
  clearSession,
  hashPassword,
  isThrottled,
  issueSession,
  recordFailure,
  requireAdmin,
  requireAuth,
  validatePassword,
  verifyPassword,
} from '../lib/auth.js';
import { audit, readAudit } from '../lib/audit.js';
import {
  clearBotLog,
  deleteBot,
  getAllStatuses,
  getStatus,
  readBotLog,
  reconcile,
  restartBot,
  startScheduler,
  stopBot,
} from '../lib/bots.js';

// 多人模式：帳號登入、每人獨立的點名程式 (bot.js)、管理後台。掛載在 /api 底下。
const router = express.Router();
router.use(attachUser);

function readLegacyConfig() {
  try {
    return YAML.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8')) || {};
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('讀取 config.yaml 失敗:', error);
    return {};
  }
}

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const fail = (res, code, message) => res.status(code).json({ status: 'error', message });

function publicUser(user) {
  return {
    username: user.username,
    role: user.role,
    disabled: Boolean(user.disabled),
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null,
    tronUser: user.config?.tron?.TRON_USER || '',
  };
}

// ---------------------------------------------------------------------------
// 登入 / 初始設定
// ---------------------------------------------------------------------------
router.get('/auth/state', (req, res) => {
  res.json({
    status: 'success',
    mode: 'multi',
    needsSetup: loadUsers().length === 0,
    user: req.user ? publicUser(req.user) : null,
  });
});

function parseCredentials(body) {
  const username = String(body?.username || '').trim().toLowerCase();
  const password = typeof body?.password === 'string' ? body.password : '';
  return { username, password };
}

router.post('/auth/setup', (req, res) => {
  if (loadUsers().length > 0) return fail(res, 409, '系統已完成初始設定');
  const { username, password } = parseCredentials(req.body);
  if (!USERNAME_PATTERN.test(username)) return fail(res, 400, '帳號需為 3–32 個小寫英數字、底線或連字號');
  const passwordError = validatePassword(password);
  if (passwordError) return fail(res, 400, passwordError);

  // 從單人版升級：把舊 config.yaml 的點名設定匯入第一位管理員
  const legacy = readLegacyConfig();
  const config = mergeBotConfig(legacy, {});
  const user = {
    username,
    passwordHash: hashPassword(password),
    role: 'admin',
    tokenVersion: 0,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    enabled: false,
    config,
  };
  saveUsers([user]);
  issueSession(res, user, req);
  req.user = user;
  audit(req, 'auth.setup', { target: username, importedLegacyConfig: Boolean(legacy.tron) });
  res.json({ status: 'success', user: publicUser(user) });
});

router.post('/auth/login', (req, res) => {
  const { username, password } = parseCredentials(req.body);
  if (isThrottled(req.ip, username)) {
    audit(req, 'auth.login.throttled', { actor: username });
    return fail(res, 429, '嘗試次數過多，請 15 分鐘後再試');
  }
  const user = findUser(username);
  const ok = user ? verifyPassword(password, user.passwordHash) : burnPasswordCheck(password) && false;
  if (!ok || user.disabled) {
    recordFailure(req.ip, username);
    audit(req, 'auth.login.failed', { actor: username, reason: ok ? 'disabled' : 'bad-credentials' });
    return fail(res, 401, ok ? '此帳號已被停用' : '帳號或密碼錯誤');
  }
  clearFailures(req.ip, username);
  const updated = updateUser(username, (u) => {
    u.lastLoginAt = new Date().toISOString();
  });
  issueSession(res, updated, req);
  req.user = updated;
  audit(req, 'auth.login');
  res.json({ status: 'success', user: publicUser(updated) });
});

router.post('/auth/logout', (req, res) => {
  if (req.user) audit(req, 'auth.logout');
  clearSession(res);
  res.json({ status: 'success' });
});

router.post('/auth/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!verifyPassword(String(currentPassword || ''), req.user.passwordHash)) return fail(res, 400, '目前密碼錯誤');
  const passwordError = validatePassword(newPassword);
  if (passwordError) return fail(res, 400, passwordError);
  const updated = updateUser(req.user.username, (u) => {
    u.passwordHash = hashPassword(newPassword);
    u.tokenVersion = (u.tokenVersion || 0) + 1;
  });
  issueSession(res, updated, req);
  audit(req, 'auth.password.change');
  res.json({ status: 'success' });
});

// ---------------------------------------------------------------------------
// 使用者自己的設定與點名程式
// ---------------------------------------------------------------------------
const toInt = (v) => (Number.isInteger(Number(v)) && String(v).trim() !== '' ? Number(v) : NaN);
const isHttpUrl = (v) => /^https?:\/\/\S+$/.test(v);

// 驗證並整理前端送來的設定；密碼留空代表沿用原本的密碼
function sanitizeBotConfig(input, current) {
  const tron = input?.tron || {};
  const scheduler = input?.scheduler || {};
  const webhook = input?.webhook || {};
  const next = {
    tron: {
      TRON_USER: String(tron.TRON_USER ?? '').trim(),
      TRON_PASS: typeof tron.TRON_PASS === 'string' && tron.TRON_PASS !== '' ? tron.TRON_PASS : current.tron.TRON_PASS,
      TRON_BASE_URL: String(tron.TRON_BASE_URL ?? '').trim().replace(/\/+$/, ''),
      TRON_INTERVAL: toInt(tron.TRON_INTERVAL),
    },
    scheduler: { START_HOUR: toInt(scheduler.START_HOUR), STOP_HOUR: toInt(scheduler.STOP_HOUR) },
    webhook: { webhook_url: String(webhook.webhook_url ?? '').trim() },
  };
  const { tron: t, scheduler: s, webhook: w } = next;
  if (!t.TRON_USER) return { error: '請輸入 Tronclass 帳號' };
  if (!isHttpUrl(t.TRON_BASE_URL)) return { error: 'Tronclass 網址需為 http(s):// 開頭' };
  if (!(t.TRON_INTERVAL >= 1000)) return { error: '輪詢間隔需為 ≥ 1000 的整數' };
  for (const key of ['START_HOUR', 'STOP_HOUR']) {
    if (!(s[key] >= 0 && s[key] <= 23)) return { error: '運行時段需為 0–23 的整數' };
  }
  if (s.START_HOUR === s.STOP_HOUR) return { error: '開始與結束時間不可相同' };
  if (w.webhook_url && !isHttpUrl(w.webhook_url)) return { error: 'Webhook 需為 http(s):// 開頭的網址' };
  return { config: next };
}

// 回傳給前端的設定永遠不包含 Tronclass 密碼
function publicBotConfig(user) {
  const config = mergeBotConfig(user.config);
  const { TRON_PASS, ...tron } = config.tron;
  return { ...config, tron: { ...tron, TRON_PASS: '' }, hasPassword: Boolean(TRON_PASS) };
}

router.get('/me/config', requireAuth, (req, res) => {
  res.json({ status: 'success', data: publicBotConfig(req.user) });
});

router.put('/me/config', requireAuth, (req, res) => {
  const current = mergeBotConfig(req.user.config);
  const { config, error } = sanitizeBotConfig(req.body?.config, current);
  if (error) return fail(res, 400, error);
  const updated = updateUser(req.user.username, (u) => {
    u.config = config;
  });
  const changed = Object.keys(DEFAULT_BOT_CONFIG).filter(
    (section) => JSON.stringify(current[section]) !== JSON.stringify(config[section]),
  );
  audit(req, 'config.update', { target: req.user.username, sections: changed });
  reconcile();
  res.json({ status: 'success', data: publicBotConfig(updated) });
});

// start = 開啟排程（在時段內就立即啟動）；stop = 關閉排程並停止；delete = 關閉排程並從 pm2 移除；restart = 重新啟動套用新設定
async function runBotAction(req, res, target, action) {
  const user = findUser(target);
  if (!user) return fail(res, 404, '找不到使用者');
  if (action === 'start') {
    if (!user.config?.tron?.TRON_USER || !user.config?.tron?.TRON_PASS) {
      return fail(res, 400, '請先設定 Tronclass 帳號與密碼');
    }
    updateUser(target, (u) => {
      u.enabled = true;
    });
    await reconcile();
  } else if (action === 'stop') {
    updateUser(target, (u) => {
      u.enabled = false;
    });
    await stopBot(target);
  } else if (action === 'delete') {
    // 從 pm2 移除程序並關閉排程，否則排程器會在下一分鐘把它重新建立
    updateUser(target, (u) => {
      u.enabled = false;
    });
    await deleteBot(target);
  } else if (action === 'restart') {
    const status = await getStatus(user);
    if (!status.shouldRun) return fail(res, 400, '目前不在運行時段或排程未開啟，無需重新啟動');
    await restartBot(target);
  } else {
    return fail(res, 400, `未知的操作: ${action}`);
  }
  audit(req, `bot.${action}`, { target });
  res.json({ status: 'success', data: await getStatus(findUser(target)) });
}

router.get('/me/bot', requireAuth, wrap(async (req, res) => {
  res.json({ status: 'success', data: await getStatus(req.user) });
}));

router.post('/me/bot/:action', requireAuth, wrap((req, res) => {
  if (req.params.action === 'delete') return fail(res, 403, '需要管理員權限');
  return runBotAction(req, res, req.user.username, req.params.action);
}));

const logBytes = (req) => Math.min(Math.max(Number(req.query.kb) || 128, 4), 1024) * 1024;

router.get('/me/bot/logs', requireAuth, wrap(async (req, res) => {
  res.json({ status: 'success', data: await readBotLog(req.user.username, logBytes(req)) });
}));

// ---------------------------------------------------------------------------
// 管理後台
// ---------------------------------------------------------------------------
const admin = express.Router();
admin.use(requireAdmin);
router.use('/admin', admin);

admin.get('/users', wrap(async (_req, res) => {
  const users = loadUsers();
  const statuses = await getAllStatuses(users);
  res.json({
    status: 'success',
    data: users.map((u) => ({ ...publicUser(u), bot: statuses.get(u.username) })),
  });
}));

admin.post('/users', (req, res) => {
  const { username, password } = parseCredentials(req.body);
  const role = req.body?.role === 'admin' ? 'admin' : 'user';
  if (!USERNAME_PATTERN.test(username)) return fail(res, 400, '帳號需為 3–32 個小寫英數字、底線或連字號');
  const passwordError = validatePassword(password);
  if (passwordError) return fail(res, 400, passwordError);
  const users = loadUsers();
  if (users.some((u) => u.username === username)) return fail(res, 409, '帳號已存在');
  const user = {
    username,
    passwordHash: hashPassword(password),
    role,
    tokenVersion: 0,
    createdAt: new Date().toISOString(),
    enabled: false,
    config: mergeBotConfig(),
  };
  saveUsers([...users, user]);
  audit(req, 'admin.user.create', { target: username, role });
  res.json({ status: 'success', data: publicUser(user) });
});

// 避免管理員把自己鎖在外面，或讓系統沒有任何可用的管理員
function guardAdminChange(req, target, { demote, disable, remove }) {
  const self = target === req.user.username;
  if (self && (demote || disable || remove)) return '不能停用、降級或刪除自己的帳號';
  const activeAdmins = loadUsers().filter((u) => u.role === 'admin' && !u.disabled);
  const targetIsActiveAdmin = activeAdmins.some((u) => u.username === target);
  if (targetIsActiveAdmin && activeAdmins.length <= 1 && (demote || disable || remove)) return '系統至少需要一位管理員';
  return null;
}

admin.patch('/users/:username', wrap(async (req, res) => {
  const target = req.params.username;
  const user = findUser(target);
  if (!user) return fail(res, 404, '找不到使用者');
  const { role, disabled, password } = req.body || {};
  if (role !== undefined && !['admin', 'user'].includes(role)) return fail(res, 400, '無效的角色');
  const guardError = guardAdminChange(req, target, {
    demote: role === 'user' && user.role === 'admin',
    disable: disabled === true,
  });
  if (guardError) return fail(res, 400, guardError);
  if (password !== undefined) {
    const passwordError = validatePassword(password);
    if (passwordError) return fail(res, 400, passwordError);
  }

  const changes = [];
  const updated = updateUser(target, (u) => {
    if (role !== undefined && role !== u.role) {
      u.role = role;
      changes.push(`role=${role}`);
    }
    if (typeof disabled === 'boolean' && disabled !== Boolean(u.disabled)) {
      u.disabled = disabled;
      changes.push(disabled ? 'disabled' : 'enabled');
    }
    if (password !== undefined) {
      u.passwordHash = hashPassword(password);
      changes.push('password-reset');
    }
    // 任何權限相關變更都讓該使用者重新登入
    if (changes.length) u.tokenVersion = (u.tokenVersion || 0) + 1;
  });
  if (changes.length) audit(req, 'admin.user.update', { target, changes });
  if (updated.disabled) await stopBot(target);
  res.json({ status: 'success', data: publicUser(updated) });
}));

admin.delete('/users/:username', wrap(async (req, res) => {
  const target = req.params.username;
  if (!findUser(target)) return fail(res, 404, '找不到使用者');
  const guardError = guardAdminChange(req, target, { remove: true });
  if (guardError) return fail(res, 400, guardError);
  await deleteBot(target);
  saveUsers(loadUsers().filter((u) => u.username !== target));
  audit(req, 'admin.user.delete', { target });
  res.json({ status: 'success' });
}));

admin.post('/users/:username/bot/:action', wrap((req, res) => runBotAction(req, res, req.params.username, req.params.action)));

admin.get('/users/:username/logs', wrap(async (req, res) => {
  if (!findUser(req.params.username)) return fail(res, 404, '找不到使用者');
  res.json({ status: 'success', data: await readBotLog(req.params.username, logBytes(req)) });
}));

admin.delete('/users/:username/logs', (req, res) => {
  if (!findUser(req.params.username)) return fail(res, 404, '找不到使用者');
  clearBotLog(req.params.username);
  audit(req, 'admin.log.clear', { target: req.params.username });
  res.json({ status: 'success' });
});

admin.get('/audit', (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000);
  const data = readAudit({ limit, username: req.query.user || undefined, action: req.query.action || undefined });
  res.json({ status: 'success', data });
});

export default function mountMultiUser(app) {
  app.use('/api', router);
  return { onListen: startScheduler };
}

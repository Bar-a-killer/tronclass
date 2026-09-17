import crypto from 'crypto';
import fs from 'fs';
import { dirname } from 'path';
import { SECRET_FILE } from './paths.js';
import { findUser } from './store.js';

const COOKIE_NAME = 'tc_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SCRYPT_KEYLEN = 64;

function loadSecret() {
  try {
    return fs.readFileSync(SECRET_FILE);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const secret = crypto.randomBytes(32);
    fs.mkdirSync(dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
    return secret;
  }
}

const SECRET = loadSecret();

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// 用不存在的帳號登入時也跑一次 scrypt，避免從回應時間猜出帳號是否存在
const DUMMY_HASH = hashPassword(crypto.randomBytes(8).toString('hex'));
export const burnPasswordCheck = (password) => verifyPassword(password, DUMMY_HASH);

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) return '密碼至少需要 8 個字元';
  if (password.length > 128) return '密碼過長';
  return null;
}

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

// Token 內含 tokenVersion：改密碼、停用帳號時遞增即可讓舊的登入全部失效
export function issueSession(res, user, req) {
  const payload = Buffer.from(
    JSON.stringify({ u: user.username, v: user.tokenVersion || 0, exp: Date.now() + SESSION_TTL_MS }),
  ).toString('base64url');
  res.cookie(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: req.secure,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1 && part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function sessionUser(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
  if (!data.exp || data.exp < Date.now()) return null;
  const user = findUser(data.u);
  if (!user || user.disabled || (user.tokenVersion || 0) !== data.v) return null;
  return user;
}

export function attachUser(req, _res, next) {
  req.user = sessionUser(req);
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ status: 'error', message: '請先登入' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ status: 'error', message: '請先登入' });
  if (req.user.role !== 'admin') return res.status(403).json({ status: 'error', message: '需要管理員權限' });
  next();
}

// 簡易登入失敗節流：同一 IP 或同一帳號 15 分鐘內失敗 10 次即暫時鎖定
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map();

function failureCount(key) {
  const entry = failures.get(key);
  if (!entry || entry.resetAt < Date.now()) {
    failures.delete(key);
    return 0;
  }
  return entry.count;
}

export function isThrottled(ip, username) {
  return failureCount(`ip:${ip}`) >= MAX_FAILURES || failureCount(`user:${username}`) >= MAX_FAILURES;
}

export function recordFailure(ip, username) {
  for (const key of [`ip:${ip}`, `user:${username}`]) {
    const count = failureCount(key);
    failures.set(key, { count: count + 1, resetAt: count === 0 ? Date.now() + WINDOW_MS : failures.get(key).resetAt });
  }
}

export function clearFailures(ip, username) {
  failures.delete(`ip:${ip}`);
  failures.delete(`user:${username}`);
}

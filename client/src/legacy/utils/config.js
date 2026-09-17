import { EMPTY_CONFIG, NUMERIC_FIELDS } from '../constants.js';

const SECTIONS = ['tron', 'scheduler', 'webhook'];

export function normalizeConfig(data = {}) {
  const result = {};
  for (const section of SECTIONS) {
    result[section] = { ...EMPTY_CONFIG[section], ...(data[section] || {}) };
  }
  return result;
}

// 編輯中的草稿:數字轉字串方便綁定 input,密碼一律留空(留空 = 沿用原密碼)
export function toDraft(config) {
  const draft = {};
  for (const section of SECTIONS) {
    draft[section] = {};
    for (const [key, value] of Object.entries(config[section])) {
      draft[section][key] = value == null ? '' : String(value);
    }
  }
  draft.tron.TRON_PASS = '';
  return draft;
}

export function toPayload(draft, savedPassword) {
  const payload = {};
  for (const section of SECTIONS) {
    payload[section] = { ...draft[section] };
    for (const key of NUMERIC_FIELDS[section] || []) {
      payload[section][key] = Number(draft[section][key]);
    }
  }
  payload.tron.TRON_BASE_URL = payload.tron.TRON_BASE_URL.trim().replace(/\/+$/, '');
  payload.webhook.webhook_url = payload.webhook.webhook_url.trim();
  if (payload.tron.TRON_PASS === '') payload.tron.TRON_PASS = savedPassword;
  return payload;
}

const isInt = (v) => /^\d+$/.test(String(v).trim());
const isHttpUrl = (v) => /^https?:\/\/\S+$/.test(String(v).trim());

export function validateDraft(draft) {
  const errors = {};
  const { tron, scheduler, webhook } = draft;

  if (!tron.TRON_USER.trim()) errors.TRON_USER = '請輸入帳號';
  if (!isHttpUrl(tron.TRON_BASE_URL)) errors.TRON_BASE_URL = '需為 http(s):// 開頭的網址';
  if (!isInt(tron.TRON_INTERVAL) || Number(tron.TRON_INTERVAL) < 1000) {
    errors.TRON_INTERVAL = '需為 ≥ 1000 的整數';
  }
  if (!isInt(scheduler.CHECK_INTERVAL) || Number(scheduler.CHECK_INTERVAL) < 1) {
    errors.CHECK_INTERVAL = '需為 ≥ 1 的整數';
  }
  if (scheduler.START_HOUR === scheduler.STOP_HOUR) {
    errors.STOP_HOUR = '開始與結束時間相同,程式將永遠不會啟動';
  }
  if (webhook.webhook_url.trim() && !isHttpUrl(webhook.webhook_url)) {
    errors.webhook_url = '需為 http(s):// 開頭的網址,或留空停用通知';
  }
  return errors;
}

export function isHourActive(hour, start, stop) {
  return start <= stop ? hour >= start && hour < stop : hour >= start || hour < stop;
}

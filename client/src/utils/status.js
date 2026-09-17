export const STATUS_STYLES = {
  online: { label: '運行中', dot: 'bg-emerald-400', text: 'text-emerald-300', ring: 'ring-emerald-400/30 bg-emerald-400/10' },
  waiting: { label: '排程待命', dot: 'bg-sky-400', text: 'text-sky-300', ring: 'ring-sky-400/30 bg-sky-400/10' },
  stopped: { label: '已停止', dot: 'bg-slate-400', text: 'text-slate-300', ring: 'ring-slate-400/30 bg-slate-400/10' },
  errored: { label: '錯誤', dot: 'bg-rose-400', text: 'text-rose-300', ring: 'ring-rose-400/30 bg-rose-400/10' },
  busy: { label: '切換中', dot: 'bg-amber-400', text: 'text-amber-300', ring: 'ring-amber-400/30 bg-amber-400/10' },
  unconfigured: { label: '未設定', dot: 'bg-amber-400', text: 'text-amber-300', ring: 'ring-amber-400/30 bg-amber-400/10' },
  disabled: { label: '帳號停用', dot: 'bg-slate-600', text: 'text-slate-400', ring: 'ring-slate-600/40 bg-slate-800' },
  unknown: { label: '未知', dot: 'bg-slate-600', text: 'text-slate-400', ring: 'ring-slate-600/40 bg-slate-800' },
};

export const PHASE_LABELS = {
  starting: '啟動中',
  'logging-in': '登入 Tronclass 中',
  running: '巡檢點名中',
  'login-failed': '登入失敗,稍後重試',
  stopped: '未運行',
};

// 綜合 pm2 狀態、排程與程式回報的狀態,算出一個顯示用的狀態
export function botStatusKey(bot, { disabled = false } = {}) {
  if (!bot) return 'unknown';
  if (disabled) return 'disabled';
  const proc = bot.process?.status;
  if (proc === 'errored') return 'errored';
  if (proc === 'launching' || proc === 'stopping' || proc === 'waiting restart') return 'busy';
  if (proc === 'online') {
    const phase = bot.runtime?.phase;
    if (phase === 'login-failed') return 'errored';
    if (phase === 'running') return 'online';
    return 'busy';
  }
  if (!bot.enabled) return bot.configured ? 'stopped' : 'unconfigured';
  return bot.shouldRun ? 'busy' : 'waiting';
}

export function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return '剛剛';
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr} 小時前`;
  return new Date(iso).toLocaleDateString('zh-TW');
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-TW', { hour12: false });
}

export function formatMemory(bytes) {
  if (bytes == null) return '—';
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

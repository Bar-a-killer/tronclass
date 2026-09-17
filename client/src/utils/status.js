import { PROCESSES } from '../constants.js';

export const STATUS_STYLES = {
  online: { label: '運行中', dot: 'bg-emerald-400', text: 'text-emerald-300', ring: 'ring-emerald-400/30 bg-emerald-400/10' },
  stopped: { label: '已暫停', dot: 'bg-slate-400', text: 'text-slate-300', ring: 'ring-slate-400/30 bg-slate-400/10' },
  errored: { label: '錯誤', dot: 'bg-rose-400', text: 'text-rose-300', ring: 'ring-rose-400/30 bg-rose-400/10' },
  partial: { label: '部分運行', dot: 'bg-amber-400', text: 'text-amber-300', ring: 'ring-amber-400/30 bg-amber-400/10' },
  busy: { label: '切換中', dot: 'bg-amber-400', text: 'text-amber-300', ring: 'ring-amber-400/30 bg-amber-400/10' },
  missing: { label: '未啟動', dot: 'bg-slate-600', text: 'text-slate-400', ring: 'ring-slate-600/40 bg-slate-800' },
  unknown: { label: '未知', dot: 'bg-slate-600', text: 'text-slate-400', ring: 'ring-slate-600/40 bg-slate-800' },
};

export function statusKey(raw) {
  if (!raw) return 'missing';
  if (raw === 'online' || raw === 'stopped' || raw === 'errored') return raw;
  if (raw === 'launching' || raw === 'stopping' || raw === 'waiting restart') return 'busy';
  return 'unknown';
}

export function summarize(processes) {
  if (!processes) return { overall: 'unknown', rows: PROCESSES.map((p) => ({ ...p, info: null, key: 'unknown' })) };
  const rows = PROCESSES.map((p) => {
    const info = processes.find((proc) => proc.name === p.name) || null;
    return { ...p, info, key: statusKey(info?.status) };
  });
  const keys = rows.map((r) => r.key);
  let overall = 'stopped';
  if (keys.every((k) => k === 'missing')) overall = 'missing';
  else if (keys.includes('errored')) overall = 'errored';
  else if (keys.includes('busy')) overall = 'busy';
  else if (keys.every((k) => k === 'online')) overall = 'online';
  else if (keys.includes('online')) overall = 'partial';
  return { overall, rows };
}

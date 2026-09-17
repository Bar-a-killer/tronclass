import { Activity, AlertTriangle, CalendarClock, Loader2, Play, RefreshCw, RotateCw, Square } from 'lucide-react';
import Card from './Card.jsx';
import StatusBadge from './StatusBadge.jsx';
import { PHASE_LABELS, formatMemory, formatRelative } from '../utils/status.js';

function Stat({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-slate-200">{children}</dd>
    </div>
  );
}

function scheduleText(bot) {
  if (!bot.enabled) return '自動點名已關閉';
  if (bot.inSchedule) return '目前在運行時段內';
  return '目前不在運行時段,時段開始時自動啟動';
}

export default function BotPanel({ bot, statusKey, pending, checkedAt, onRun }) {
  const busy = pending !== null;
  const online = bot?.process?.status === 'online';
  const runtime = online ? bot?.runtime : null;

  const buttons = [
    bot?.enabled
      ? { action: 'stop', label: '停止', icon: Square, className: 'bg-slate-800 text-amber-300 ring-1 ring-inset ring-slate-700 hover:bg-slate-700' }
      : { action: 'start', label: '開啟自動點名', icon: Play, className: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400', disabled: !bot?.configured, hint: '請先在右側設定 Tronclass 帳號與密碼' },
    { action: 'restart', label: '重新啟動', icon: RotateCw, className: 'bg-slate-800 text-slate-200 ring-1 ring-inset ring-slate-700 hover:bg-slate-700', disabled: !bot?.shouldRun, hint: '只有在運行時段內才能重新啟動' },
  ];

  return (
    <Card
      title="我的自動點名"
      icon={Activity}
      actions={
        <button
          type="button"
          onClick={() => onRun('refresh')}
          disabled={busy}
          title="重新整理狀態"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${pending === 'refresh' ? 'animate-spin' : ''}`} />
          {checkedAt ? checkedAt.toLocaleTimeString('zh-TW', { hour12: false }) : '重新整理'}
        </button>
      }
    >
      {!bot ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          讀取狀態中…
        </div>
      ) : (
        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-100">{runtime ? PHASE_LABELS[runtime.phase] || runtime.phase : online ? '啟動中' : '未運行'}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarClock className="h-3.5 w-3.5" />
                {scheduleText(bot)}
              </p>
            </div>
            <StatusBadge status={statusKey} />
          </div>

          {online && (
            <dl className="grid grid-cols-3 gap-3 rounded-xl bg-slate-950/50 px-4 py-3">
              <Stat label="最後檢查">{formatRelative(runtime?.lastCheckAt)}</Stat>
              <Stat label="檢查次數">{runtime?.checks ?? 0}</Stat>
              <Stat label="記憶體">{formatMemory(bot.process.memory)}</Stat>
            </dl>
          )}

          {runtime?.lastError && (
            <p className="flex gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/20">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">
                {runtime.lastError.message}
                <span className="ml-1 text-rose-400/60">· {formatRelative(runtime.lastError.at)}</span>
              </span>
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-slate-800 p-4">
        {buttons.map(({ action, label, icon: Icon, className, disabled, hint }) => (
          <button
            key={action}
            type="button"
            onClick={() => onRun(action)}
            disabled={busy || !bot || disabled}
            title={disabled ? hint : undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
          >
            {pending === action ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
}

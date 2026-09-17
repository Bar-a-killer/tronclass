import { useState } from 'react';
import { Activity, Loader2, Pause, Play, RefreshCw, Trash2 } from 'lucide-react';
import Card from './Card.jsx';
import StatusBadge from './StatusBadge.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

const ACTION_BUTTONS = [
  {
    action: 'start',
    label: '啟動',
    icon: Play,
    className: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 focus-visible:ring-emerald-400',
  },
  {
    action: 'stop',
    label: '暫停',
    icon: Pause,
    className: 'bg-slate-800 text-amber-300 ring-1 ring-inset ring-slate-700 hover:bg-slate-700 focus-visible:ring-amber-400',
  },
  {
    action: 'delete',
    label: '刪除',
    icon: Trash2,
    className: 'bg-slate-800 text-rose-300 ring-1 ring-inset ring-slate-700 hover:bg-rose-500/15 hover:ring-rose-500/40 focus-visible:ring-rose-400',
  },
];

function isActionAvailable(action, rows, known) {
  if (!known) return true;
  const keys = rows.map((r) => r.key);
  if (action === 'start') return !keys.every((k) => k === 'online');
  if (action === 'stop') return keys.includes('online') || keys.includes('busy');
  if (action === 'delete') return keys.some((k) => k !== 'missing');
  return true;
}

const ACTION_HINTS = {
  start: '所有程序都已在運行',
  stop: '沒有正在運行的程序',
  delete: '沒有可刪除的程序',
};

export default function ProcessPanel({ pending, rows, known, checkedAt, onRun }) {
  const [confirming, setConfirming] = useState(false);
  const busy = pending !== null;

  const handleClick = (action) => {
    if (action === 'delete') setConfirming(true);
    else onRun(action);
  };

  return (
    <Card
      title="程序控制"
      icon={Activity}
      actions={
        <button
          type="button"
          onClick={() => onRun('list')}
          disabled={busy}
          title="重新整理狀態 (pm2 list)"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${pending === 'list' ? 'animate-spin' : ''}`} />
          {checkedAt ? checkedAt.toLocaleTimeString('zh-TW', { hour12: false }) : '重新整理'}
        </button>
      }
    >
      <ul className="divide-y divide-slate-800">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-100">{row.label}</p>
              <p className="truncate font-mono text-xs text-slate-500">
                {row.name}
                {row.info && row.key === 'online' && (
                  <span className="ml-2 text-slate-400">
                    {row.info.uptime} · {row.info.cpu} · {row.info.memory}
                  </span>
                )}
                {row.info && Number(row.info.restarts) > 0 && (
                  <span className="ml-2 text-amber-400/80">重啟 {row.info.restarts} 次</span>
                )}
              </p>
            </div>
            <StatusBadge status={row.key} />
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-3 gap-2 border-t border-slate-800 p-4">
        {ACTION_BUTTONS.map(({ action, label, icon: Icon, className }) => {
          const available = isActionAvailable(action, rows, known);
          return (
            <button
              key={action}
              type="button"
              onClick={() => handleClick(action)}
              disabled={busy || !available}
              title={available ? `npm run ${action}` : ACTION_HINTS[action]}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
            >
              {pending === action ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              {label}
            </button>
          );
        })}
      </div>

      {confirming && (
        <ConfirmDialog
          title="刪除程序?"
          message="會從 PM2 移除點名主程式與排程器。之後需要重新按「啟動」才會恢復運作。"
          confirmLabel="刪除"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            onRun('delete');
          }}
        />
      )}
    </Card>
  );
}

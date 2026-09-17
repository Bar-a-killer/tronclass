import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Ban, KeyRound, Loader2, MoreHorizontal, Play, RotateCw, ScrollText, Shield, ShieldOff, Square, Trash2, UserCheck } from 'lucide-react';
import StatusBadge from '../StatusBadge.jsx';
import { PHASE_LABELS, botStatusKey, formatDateTime, formatMemory, formatRelative } from '../../utils/status.js';

function RowMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="更多操作"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-2xl">
          {items.filter(Boolean).map(({ label, icon: Icon, onClick, danger, disabled, title }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              disabled={disabled}
              title={title}
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 ${
                danger ? 'text-rose-300' : 'text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconButton({ label, icon: Icon, onClick, disabled, loading, className = 'text-slate-400 hover:text-slate-200' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-lg p-1.5 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30 ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
    </button>
  );
}

function StatusCell({ user }) {
  const { bot } = user;
  const key = botStatusKey(bot, { disabled: user.disabled });
  const online = bot?.process?.status === 'online';
  const phase = online ? bot.runtime?.phase : null;
  let detail;
  if (user.disabled) detail = '帳號已停用';
  else if (phase) detail = PHASE_LABELS[phase] || phase;
  else if (!bot?.configured) detail = '尚未填寫 Tronclass 帳密';
  else if (!bot?.enabled) detail = '使用者未開啟';
  else if (!bot?.inSchedule) detail = '不在運行時段';
  return (
    <div className="space-y-1">
      <StatusBadge status={key} />
      {detail && <p className="text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

export default function UserTable({ users, currentUser, pending, onAction, onShowLogs, onResetPassword, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="text-xs text-slate-500">
          <tr className="border-b border-slate-800">
            <th scope="col" className="px-5 py-2.5 font-medium">使用者</th>
            <th scope="col" className="px-3 py-2.5 font-medium">狀態</th>
            <th scope="col" className="px-3 py-2.5 font-medium">最後檢查</th>
            <th scope="col" className="px-3 py-2.5 font-medium">最近錯誤</th>
            <th scope="col" className="px-3 py-2.5 font-medium">資源</th>
            <th scope="col" className="px-5 py-2.5 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {users.map((user) => {
            const { bot } = user;
            const self = user.username === currentUser.username;
            const runtime = bot?.process?.status === 'online' ? bot.runtime : null;
            const lastError = bot?.runtime?.lastError;
            const busy = pending?.startsWith(`${user.username}:`);
            const is = (action) => pending === `${user.username}:${action}`;
            return (
              <tr key={user.username} className={`align-top ${user.disabled ? 'opacity-60' : ''}`}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-100">{user.username}</span>
                    {user.role === 'admin' && (
                      <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300 ring-1 ring-inset ring-indigo-400/30">管理員</span>
                    )}
                    {self && <span className="text-[10px] text-slate-500">(你)</span>}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">{user.tronUser || '未設定學號'}</p>
                  <p className="mt-0.5 text-xs text-slate-600" title={formatDateTime(user.lastLoginAt)}>
                    登入:{user.lastLoginAt ? formatRelative(user.lastLoginAt) : '從未'}
                  </p>
                </td>
                <td className="px-3 py-3"><StatusCell user={user} /></td>
                <td className="px-3 py-3 text-xs text-slate-400">
                  {runtime ? (
                    <>
                      <p title={formatDateTime(runtime.lastCheckAt)}>{formatRelative(runtime.lastCheckAt)}</p>
                      <p className="text-slate-600">共 {runtime.checks ?? 0} 次</p>
                    </>
                  ) : '—'}
                </td>
                <td className="max-w-[16rem] px-3 py-3 text-xs">
                  {lastError ? (
                    <p className="flex gap-1.5 text-rose-300" title={lastError.message}>
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0">
                        <span className="line-clamp-2 break-words">{lastError.message}</span>
                        <span className="text-rose-400/60">{formatRelative(lastError.at)}</span>
                      </span>
                    </p>
                  ) : <span className="text-slate-600">—</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-500">
                  {bot?.process?.status === 'online' ? (
                    <>
                      <p>{formatMemory(bot.process.memory)} · {bot.process.cpu ?? 0}%</p>
                      {bot.process.restarts > 0 && <p className="text-amber-400/80">重啟 {bot.process.restarts} 次</p>}
                    </>
                  ) : '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-0.5">
                    {bot?.enabled ? (
                      <IconButton label="停止自動點名" icon={Square} className="text-amber-300 hover:text-amber-200" loading={is('stop')} disabled={busy} onClick={() => onAction(user.username, 'stop')} />
                    ) : (
                      <IconButton label={bot?.configured ? '開啟自動點名' : '使用者尚未設定帳密'} icon={Play} className="text-emerald-300 hover:text-emerald-200" loading={is('start')} disabled={busy || !bot?.configured || user.disabled} onClick={() => onAction(user.username, 'start')} />
                    )}
                    <IconButton label={bot?.shouldRun ? '重新啟動' : '不在運行時段'} icon={RotateCw} loading={is('restart')} disabled={busy || !bot?.shouldRun} onClick={() => onAction(user.username, 'restart')} />
                    <IconButton label="查看 log" icon={ScrollText} onClick={() => onShowLogs(user.username)} />
                    <RowMenu
                      items={[
                        { label: '重設密碼', icon: KeyRound, onClick: () => onResetPassword(user.username) },
                        !self && (user.role === 'admin'
                          ? { label: '改為一般使用者', icon: ShieldOff, onClick: () => onAction(user.username, 'patch', { role: 'user' }) }
                          : { label: '設為管理員', icon: Shield, onClick: () => onAction(user.username, 'patch', { role: 'admin' }) }),
                        !self && (user.disabled
                          ? { label: '啟用帳號', icon: UserCheck, onClick: () => onAction(user.username, 'patch', { disabled: false }) }
                          : { label: '停用帳號', icon: Ban, danger: true, onClick: () => onAction(user.username, 'patch', { disabled: true }) }),
                        !self && { label: '刪除帳號', icon: Trash2, danger: true, onClick: () => onDelete(user.username) },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

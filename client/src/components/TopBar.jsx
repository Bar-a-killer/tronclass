import { useEffect, useRef, useState } from 'react';
import { ChevronDown, KeyRound, LayoutDashboard, LogOut, Radar, ShieldCheck, UserRound } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';

const NAV = [
  { route: 'dashboard', label: '控制面板', icon: LayoutDashboard },
  { route: 'admin', label: '管理後台', icon: ShieldCheck, adminOnly: true },
];

function UserMenu({ user, onChangePassword, onLogout }) {
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

  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-800';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700">
          <UserRound className="h-4 w-4 text-slate-400" />
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{user.username}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-2xl">
          <div className="border-b border-slate-800 px-3 py-2">
            <p className="truncate text-sm font-medium text-slate-100">{user.username}</p>
            <p className="text-xs text-slate-500">{user.role === 'admin' ? '管理員' : '一般使用者'}</p>
          </div>
          <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onChangePassword(); }}>
            <KeyRound className="h-4 w-4 text-slate-500" />
            修改密碼
          </button>
          <button type="button" role="menuitem" className={`${item} text-rose-300`} onClick={() => { setOpen(false); onLogout(); }}>
            <LogOut className="h-4 w-4" />
            登出
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopBar({ user, route, onNavigate, status, statusLabel, onChangePassword, onLogout }) {
  const links = NAV.filter((n) => !n.adminOnly || user.role === 'admin');
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/20">
            <Radar className="h-5 w-5 text-white" />
          </div>
          <h1 className="hidden text-sm font-semibold text-slate-100 md:block md:text-base">Tronclass 自動點名</h1>
          {links.length > 1 && (
            <nav className="flex gap-1 md:ml-4">
              {links.map(({ route: r, label, icon: Icon }) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onNavigate(r)}
                  aria-current={route === r ? 'page' : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition ${
                    route === r ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status && <StatusBadge status={status} label={statusLabel} />}
          <UserMenu user={user} onChangePassword={onChangePassword} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}

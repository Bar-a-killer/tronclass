import { useState } from 'react';
import { Loader2, LogIn, Radar, ShieldCheck } from 'lucide-react';
import Field from '../components/config/Field.jsx';

export default function LoginPage({ needsSetup, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const mismatch = needsSetup && confirm && confirm !== password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || mismatch) return;
    setSubmitting(true);
    setError(null);
    try {
      await onLogin(username.trim(), password, { setup: needsSetup });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.1),transparent_60%)] px-4 text-slate-200 antialiased">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/20">
            <Radar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Tronclass 自動點名</h1>
            <p className="mt-1 text-sm text-slate-500">
              {needsSetup ? '第一次使用,請建立管理員帳號' : '登入以管理你的自動點名'}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20"
        >
          {needsSetup && (
            <p className="flex gap-2 rounded-lg bg-sky-400/10 px-3 py-2 text-xs leading-relaxed text-sky-200 ring-1 ring-inset ring-sky-400/20">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              若原本有 config.yaml,裡面的 Tronclass 帳號、時段與 Webhook 會自動匯入這個帳號。
            </p>
          )}
          <Field
            id="login-username"
            label="帳號"
            autoComplete="username"
            autoFocus
            required
            value={username}
            hint={needsSetup ? '3–32 個小寫英數字、底線或連字號' : undefined}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Field
            id="login-password"
            label="密碼"
            type="password"
            autoComplete={needsSetup ? 'new-password' : 'current-password'}
            required
            value={password}
            hint={needsSetup ? '至少 8 個字元' : undefined}
            onChange={(e) => setPassword(e.target.value)}
          />
          {needsSetup && (
            <Field
              id="login-confirm"
              label="確認密碼"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              error={mismatch ? '兩次輸入的密碼不同' : undefined}
              onChange={(e) => setConfirm(e.target.value)}
            />
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/30">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || !username || !password || (needsSetup && (!confirm || mismatch))}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-sky-950 transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {needsSetup ? '建立並登入' : '登入'}
          </button>
        </form>
        {!needsSetup && <p className="mt-4 text-center text-xs text-slate-600">沒有帳號?請向管理員申請。</p>}
      </div>
    </div>
  );
}

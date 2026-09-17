import { Suspense, lazy, useCallback, useState } from 'react';
import { Loader2, WifiOff } from 'lucide-react';
import TopBar from './components/TopBar.jsx';
import PasswordDialog from './components/PasswordDialog.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useLogConsole } from './hooks/useLogConsole.js';
import { useAppConfig } from './hooks/useAppConfig.js';
import { useBot } from './hooks/useBot.js';
import { botStatusKey } from './utils/status.js';

// 單人模式沿用原本的介面(不需登入);管理後台只有多人模式會用到
const LegacyApp = lazy(() => import('./legacy/app.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));

const OVERALL_LABELS = {
  online: '自動點名運行中',
  waiting: '等待運行時段',
  stopped: '自動點名已關閉',
  errored: '程序發生錯誤',
  busy: '狀態切換中',
  unconfigured: '尚未設定帳號',
  unknown: '檢查狀態中',
};

const shell = 'min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_60%)] text-slate-200 antialiased';

// 登入後才掛載,確保 hooks 的 API 呼叫都帶著有效的登入狀態
function SignedInApp({ user, onLogout }) {
  const [route, navigate] = useHashRoute();
  const [changingPassword, setChangingPassword] = useState(false);
  const logConsole = useLogConsole();
  const bot = useBot(logConsole.addLog);
  const config = useAppConfig(logConsole.addLog, bot.refresh);
  const statusKey = botStatusKey(bot.bot);
  const page = route === 'admin' && user.role === 'admin' ? 'admin' : 'dashboard';

  const onPasswordChanged = useCallback(() => {
    setChangingPassword(false);
    logConsole.addLog('登入密碼已更新', 'success');
  }, [logConsole]);

  return (
    <div className={shell}>
      <TopBar
        user={user}
        route={page}
        onNavigate={navigate}
        status={statusKey}
        statusLabel={OVERALL_LABELS[statusKey]}
        onChangePassword={() => setChangingPassword(true)}
        onLogout={onLogout}
      />
      {page === 'admin' ? (
        <Suspense fallback={<Loading />}>
          <AdminPage currentUser={user} />
        </Suspense>
      ) : (
        <Dashboard bot={bot} statusKey={statusKey} logConsole={logConsole} config={config} />
      )}
      {changingPassword && <PasswordDialog onClose={() => setChangingPassword(false)} onDone={onPasswordChanged} />}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      載入中…
    </div>
  );
}

function App() {
  const { status, mode, user, needsSetup, error, login, logout, refresh } = useAuth();

  if (status === 'loading') {
    return (
      <div className={shell}>
        <Loading />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`${shell} flex flex-col items-center justify-center gap-3 px-4 text-center`}>
        <WifiOff className="h-8 w-8 text-slate-600" />
        <p className="text-sm text-slate-400">無法連線到後端:{error}</p>
        <button type="button" onClick={refresh} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700">
          重試
        </button>
      </div>
    );
  }

  if (mode === 'single') {
    return (
      <Suspense fallback={<div className={shell}><Loading /></div>}>
        <LegacyApp />
      </Suspense>
    );
  }

  if (!user) return <LoginPage needsSetup={needsSetup} onLogin={login} />;

  // key 讓切換帳號時所有狀態重新初始化
  return <SignedInApp key={user.username} user={user} onLogout={logout} />;
}

export default App;

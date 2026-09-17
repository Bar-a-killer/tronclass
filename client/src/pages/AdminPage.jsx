import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, History, Loader2, RefreshCw, UserPlus, Users, X } from 'lucide-react';
import Card from '../components/Card.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import UserTable from '../components/admin/UserTable.jsx';
import AuditPanel from '../components/admin/AuditPanel.jsx';
import LogDialog from '../components/admin/LogDialog.jsx';
import CreateUserDialog from '../components/admin/CreateUserDialog.jsx';
import ResetPasswordDialog from '../components/admin/ResetPasswordDialog.jsx';
import { useAdminUsers } from '../hooks/useAdminUsers.js';
import { admin } from '../api/client.js';
import { botStatusKey } from '../utils/status.js';

const ACTION_MESSAGES = { start: '已開啟自動點名', stop: '已停止自動點名', restart: '已重新啟動', delete: '的程序已刪除' };

function patchMessage(username, patch) {
  if (patch.role) return `${username} 已${patch.role === 'admin' ? '設為管理員' : '改為一般使用者'}`;
  if (patch.disabled !== undefined) return `${username} 已${patch.disabled ? '停用' : '啟用'}`;
  return `${username} 已更新`;
}

function Summary({ users }) {
  const stats = useMemo(() => {
    const keys = users.map((u) => botStatusKey(u.bot, { disabled: u.disabled }));
    return [
      { label: '使用者', value: users.length, tone: 'text-slate-100' },
      { label: '運行中', value: keys.filter((k) => k === 'online').length, tone: 'text-emerald-300' },
      { label: '排程待命', value: keys.filter((k) => k === 'waiting').length, tone: 'text-sky-300' },
      { label: '異常', value: keys.filter((k) => k === 'errored').length, tone: 'text-rose-300' },
    ];
  }, [users]);

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ label, value, tone }) => (
        <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AdminPage({ currentUser }) {
  const { users, error, checkedAt, pending, notice, clearNotice, refresh, perform } = useAdminUsers();
  const [tab, setTab] = useState('users');
  const [dialog, setDialog] = useState(null);

  const onAction = (username, action, patch) => {
    if (action === 'patch') {
      return perform(`${username}:patch`, () => admin.updateUser(username, patch), patchMessage(username, patch));
    }
    return perform(`${username}:${action}`, () => admin.botAction(username, action), `${username} ${ACTION_MESSAGES[action]}`);
  };

  const close = () => setDialog(null);
  const tabButton = (key, label, Icon) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
        tab === key ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {notice && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-xl px-4 py-2.5 text-sm ring-1 ring-inset ${
            notice.type === 'error' ? 'bg-rose-500/10 text-rose-300 ring-rose-500/30' : 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
          }`}
        >
          {notice.type === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="flex-1">{notice.message}</span>
          <button type="button" onClick={clearNotice} aria-label="關閉訊息" className="opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {users && <Summary users={users} />}

      <div role="tablist" className="flex gap-1">
        {tabButton('users', '使用者狀態', Users)}
        {tabButton('audit', '稽核紀錄', History)}
      </div>

      {tab === 'users' ? (
        <Card
          title="使用者狀態"
          icon={Users}
          actions={
            <>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {checkedAt ? checkedAt.toLocaleTimeString('zh-TW', { hour12: false }) : '重新整理'}
              </button>
              <button
                type="button"
                onClick={() => setDialog({ type: 'create' })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-2.5 py-1 text-xs font-semibold text-sky-950 transition hover:bg-sky-400"
              >
                <UserPlus className="h-3.5 w-3.5" />
                新增
              </button>
            </>
          }
        >
          {error && <p className="px-5 py-3 text-sm text-rose-400">讀取失敗:{error}</p>}
          {!users ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              載入中…
            </div>
          ) : (
            <UserTable
              users={users}
              currentUser={currentUser}
              pending={pending}
              onAction={onAction}
              onShowLogs={(username) => setDialog({ type: 'logs', username })}
              onResetPassword={(username) => setDialog({ type: 'password', username })}
              onDelete={(username) => setDialog({ type: 'delete', username })}
              onDeleteProcess={(username) => setDialog({ type: 'deleteProcess', username })}
            />
          )}
        </Card>
      ) : (
        <AuditPanel usernames={(users || []).map((u) => u.username)} />
      )}

      {dialog?.type === 'create' && (
        <CreateUserDialog
          onClose={close}
          onCreate={(user) => perform('create', () => admin.createUser(user), `已建立使用者 ${user.username}`)}
        />
      )}
      {dialog?.type === 'logs' && (
        <LogDialog
          username={dialog.username}
          onClose={close}
          onCleared={() => perform(`${dialog.username}:clear`, () => admin.clearLogs(dialog.username), `已清空 ${dialog.username} 的 log`)}
        />
      )}
      {dialog?.type === 'password' && (
        <ResetPasswordDialog
          username={dialog.username}
          onClose={close}
          onSubmit={(password) => perform(`${dialog.username}:patch`, () => admin.updateUser(dialog.username, { password }), `已重設 ${dialog.username} 的密碼`)}
        />
      )}
      {dialog?.type === 'deleteProcess' && (
        <ConfirmDialog
          title={`刪除 ${dialog.username} 的程序?`}
          message="會從 PM2 移除這位使用者的點名程式並關閉自動點名。帳號、設定與 log 都會保留,之後按「開啟自動點名」即可重新建立。"
          confirmLabel="刪除程序"
          onCancel={close}
          onConfirm={() => {
            const { username } = dialog;
            close();
            onAction(username, 'delete');
          }}
        />
      )}
      {dialog?.type === 'delete' && (
        <ConfirmDialog
          title={`刪除 ${dialog.username}?`}
          message="會停止並移除這位使用者的點名程式,並刪除帳號與設定。log 檔會保留在伺服器上。"
          confirmLabel="刪除"
          onCancel={close}
          onConfirm={() => {
            const { username } = dialog;
            close();
            perform(`${username}:delete`, () => admin.deleteUser(username), `已刪除 ${username}`);
          }}
        />
      )}
    </main>
  );
}

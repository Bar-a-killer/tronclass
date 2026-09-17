import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, RefreshCw } from 'lucide-react';
import Card from '../Card.jsx';
import { admin } from '../../api/client.js';
import { formatDateTime } from '../../utils/status.js';

const ACTION_LABELS = {
  'auth.setup': '初始設定',
  'auth.login': '登入',
  'auth.login.failed': '登入失敗',
  'auth.login.throttled': '登入被暫時封鎖',
  'auth.logout': '登出',
  'auth.password.change': '修改密碼',
  'config.update': '修改點名設定',
  'bot.start': '開啟自動點名',
  'bot.stop': '停止自動點名',
  'bot.restart': '重新啟動',
  'admin.user.create': '新增使用者',
  'admin.user.update': '修改使用者',
  'admin.user.delete': '刪除使用者',
  'admin.log.clear': '清空 log',
};

const FILTERS = [
  { value: '', label: '全部' },
  { value: 'auth', label: '登入相關' },
  { value: 'bot', label: '程序操作' },
  { value: 'config', label: '設定變更' },
  { value: 'admin', label: '管理操作' },
];

const CHANGE_LABELS = { disabled: '停用帳號', enabled: '啟用帳號', 'password-reset': '重設密碼', 'role=admin': '設為管理員', 'role=user': '設為一般使用者' };
const SECTION_LABELS = { tron: '帳戶', scheduler: '時段', webhook: '通知' };
const REASON_LABELS = { 'bad-credentials': '帳密錯誤', disabled: '帳號已停用' };

function describe(entry) {
  const parts = [];
  if (entry.target && entry.target !== entry.actor) parts.push(`對象:${entry.target}`);
  if (entry.role) parts.push(`角色:${entry.role === 'admin' ? '管理員' : '一般使用者'}`);
  if (entry.changes) parts.push(entry.changes.map((c) => CHANGE_LABELS[c] || c).join('、'));
  if (entry.sections) parts.push(entry.sections.length ? `變更:${entry.sections.map((s) => SECTION_LABELS[s] || s).join('、')}` : '無變更');
  if (entry.reason) parts.push(REASON_LABELS[entry.reason] || entry.reason);
  if (entry.importedLegacyConfig) parts.push('已匯入舊 config.yaml');
  return parts.join(' · ');
}

const tone = (action) =>
  action.includes('failed') || action.includes('throttled') || action.includes('delete')
    ? 'text-rose-300'
    : action.startsWith('admin') ? 'text-amber-300' : 'text-slate-200';

export default function AuditPanel({ usernames }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState('');
  const [action, setAction] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await admin.audit({ user, action }));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, action]);

  useEffect(() => {
    load();
  }, [load]);

  const select = 'rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-sm text-slate-100 focus:border-sky-500 focus:outline-none';

  return (
    <Card
      title="稽核紀錄"
      icon={History}
      actions={
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          重新整理
        </button>
      }
    >
      <div className="flex flex-wrap gap-2 border-b border-slate-800 px-5 py-3">
        <select aria-label="篩選使用者" value={user} onChange={(e) => setUser(e.target.value)} className={select}>
          <option value="">所有使用者</option>
          {usernames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select aria-label="篩選類型" value={action} onChange={(e) => setAction(e.target.value)} className={select}>
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      {error && <p className="px-5 py-3 text-sm text-rose-400">讀取失敗:{error}</p>}
      {!entries ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          載入中…
        </div>
      ) : entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">沒有符合的紀錄。</p>
      ) : (
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900 text-xs text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium">時間</th>
                <th scope="col" className="px-3 py-2 font-medium">操作者</th>
                <th scope="col" className="px-3 py-2 font-medium">動作</th>
                <th scope="col" className="px-3 py-2 font-medium">內容</th>
                <th scope="col" className="px-5 py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {entries.map((e, i) => (
                <tr key={`${e.at}-${i}`} className="align-top">
                  <td className="whitespace-nowrap px-5 py-2 font-mono text-xs text-slate-500">{formatDateTime(e.at)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-300">{e.actor || '—'}</td>
                  <td className={`whitespace-nowrap px-3 py-2 ${tone(e.action)}`}>{ACTION_LABELS[e.action] || e.action}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{describe(e)}</td>
                  <td className="whitespace-nowrap px-5 py-2 font-mono text-xs text-slate-600">{e.ip?.replace(/^::ffff:/, '') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

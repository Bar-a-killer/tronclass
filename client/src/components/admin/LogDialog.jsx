import { useCallback, useState } from 'react';
import { Eraser, RefreshCw, ScrollText, Search } from 'lucide-react';
import Modal from '../Modal.jsx';
import { buttonStyles } from '../buttonStyles.js';
import LogView from '../LogView.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import { useLogTail } from '../../hooks/useLogTail.js';
import { admin } from '../../api/client.js';

export default function LogDialog({ username, onClose, onCleared }) {
  const fetchLog = useCallback(() => admin.getLogs(username), [username]);
  const { text, error, loading, reload } = useLogTail(fetchLog, { intervalMs: 5000 });
  const [filter, setFilter] = useState('');
  const [confirming, setConfirming] = useState(false);

  const clear = async () => {
    setConfirming(false);
    await onCleared();
    reload();
  };

  return (
    <Modal title={`${username} 的程式日誌`} icon={ScrollText} onClose={onClose} size="max-w-4xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 focus-within:border-sky-500">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="篩選關鍵字,例如 error、Rollcall"
            aria-label="篩選 log"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
          />
        </label>
        <button type="button" onClick={reload} className={buttonStyles.small}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          重新整理
        </button>
        <button type="button" onClick={() => setConfirming(true)} disabled={!text} className={`${buttonStyles.small} hover:text-rose-300`}>
          <Eraser className="h-3.5 w-3.5" />
          清空
        </button>
      </div>
      {error && <p className="px-4 pt-2 text-xs text-rose-400">讀取失敗:{error}</p>}
      <LogView text={text} filter={filter} className="h-[60vh] rounded-b-2xl" emptyText="這位使用者的點名程式還沒有產生 log。" />
      {confirming && (
        <ConfirmDialog
          title="清空 log?"
          message={`會清除 ${username} 目前所有的程式日誌,無法復原。`}
          confirmLabel="清空"
          onCancel={() => setConfirming(false)}
          onConfirm={clear}
        />
      )}
    </Modal>
  );
}

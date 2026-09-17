import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';
import { buttonStyles } from './buttonStyles.js';
import Field from './config/Field.jsx';
import { auth } from '../api/client.js';

export default function PasswordDialog({ onClose, onDone }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const mismatch = confirm && confirm !== next;
  const tooShort = next && next.length < 8;
  const canSubmit = current && next && confirm && !mismatch && !tooShort && !saving;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await auth.changePassword(current, next);
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title="修改登入密碼" icon={KeyRound} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <Field id="pw-current" label="目前密碼" type="password" autoComplete="current-password" autoFocus value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Field id="pw-new" label="新密碼" type="password" autoComplete="new-password" value={next} error={tooShort ? '至少 8 個字元' : undefined} onChange={(e) => setNext(e.target.value)} />
        <Field id="pw-confirm" label="確認新密碼" type="password" autoComplete="new-password" value={confirm} error={mismatch ? '兩次輸入的密碼不同' : undefined} onChange={(e) => setConfirm(e.target.value)} />
        <p className="text-xs text-slate-500">變更後,其他裝置上的登入會被登出。</p>
        {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonStyles.ghost}>取消</button>
          <button type="submit" disabled={!canSubmit} className={buttonStyles.primary}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            更新密碼
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import Modal from '../Modal.jsx';
import { buttonStyles } from '../buttonStyles.js';
import Field from '../config/Field.jsx';

export default function ResetPasswordDialog({ username, onClose, onSubmit }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const error = password && password.length < 8 ? '至少 8 個字元' : undefined;

  const submit = async (e) => {
    e.preventDefault();
    if (!password || error || saving) return;
    setSaving(true);
    const ok = await onSubmit(password);
    if (ok) onClose();
    else setSaving(false);
  };

  return (
    <Modal title={`重設 ${username} 的密碼`} icon={KeyRound} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <Field id="reset-password" label="新密碼" type="text" autoComplete="off" autoFocus value={password} error={error} hint="該使用者的所有登入會被登出" onChange={(e) => setPassword(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonStyles.ghost}>取消</button>
          <button type="submit" disabled={!password || Boolean(error) || saving} className={buttonStyles.primary}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            重設
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import Modal from '../Modal.jsx';
import { buttonStyles } from '../buttonStyles.js';
import Field from '../config/Field.jsx';

const USERNAME_PATTERN = /^[a-z0-9_-]{3,32}$/;

export default function CreateUserDialog({ onClose, onCreate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [saving, setSaving] = useState(false);

  const name = username.trim().toLowerCase();
  const nameError = name && !USERNAME_PATTERN.test(name) ? '3–32 個小寫英數字、底線或連字號' : undefined;
  const passwordError = password && password.length < 8 ? '至少 8 個字元' : undefined;
  const canSubmit = name && password && !nameError && !passwordError && !saving;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    const ok = await onCreate({ username: name, password, role });
    if (ok) onClose();
    else setSaving(false);
  };

  const generate = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(9));
    setPassword(btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 12));
  };

  return (
    <Modal title="新增使用者" icon={UserPlus} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <Field id="new-username" label="帳號" autoComplete="off" autoFocus value={username} error={nameError} onChange={(e) => setUsername(e.target.value)} />
        <Field
          id="new-password"
          label="初始密碼"
          type="text"
          autoComplete="off"
          value={password}
          error={passwordError}
          hint="請轉交給使用者,登入後可自行修改"
          onChange={(e) => setPassword(e.target.value)}
          trailing={
            <button type="button" onClick={generate} className="px-3 text-xs text-sky-400 transition hover:text-sky-300">
              產生
            </button>
          }
        />
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-slate-400">角色</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'user', label: '一般使用者', desc: '只能管理自己的點名' },
              { value: 'admin', label: '管理員', desc: '可查看所有人與 log' },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-lg border px-3 py-2 transition ${
                  role === opt.value ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <input type="radio" name="role" value={opt.value} checked={role === opt.value} onChange={() => setRole(opt.value)} className="sr-only" />
                <span className="block text-sm text-slate-100">{opt.label}</span>
                <span className="block text-xs text-slate-500">{opt.desc}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={buttonStyles.ghost}>取消</button>
          <button type="submit" disabled={!canSubmit} className={buttonStyles.primary}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            建立
          </button>
        </div>
      </form>
    </Modal>
  );
}

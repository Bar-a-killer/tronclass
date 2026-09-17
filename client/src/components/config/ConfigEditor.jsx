import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarClock, Code2, Eye, EyeOff, Loader2, RotateCcw, Save, Settings2, UserRound, WifiOff } from 'lucide-react';
import Card from '../Card.jsx';
import Field from './Field.jsx';
import ScheduleBar from './ScheduleBar.jsx';
import { toPayload } from '../../utils/config.js';
import { toYamlString } from '../../utils/yaml.js';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => String(h));

function Section({ icon: Icon, title, children }) {
  return (
    <div className="space-y-4 px-5 py-5">
      <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function HourSelect({ id, label, value, error, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 ${
          error ? 'border-rose-500/60 focus:ring-rose-500/30' : 'border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'
        }`}
      >
        {!HOUR_OPTIONS.includes(value) && <option value={value}>{value}</option>}
        {HOUR_OPTIONS.map((h) => (
          <option key={h} value={h}>{h.padStart(2, '0')}:00</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

function Placeholder({ status, onRetry }) {
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
        <WifiOff className="h-8 w-8 text-slate-600" />
        <p className="text-sm text-slate-400">無法從後端讀取 config.yaml</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
        >
          重試
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      載入設定中…
    </div>
  );
}

export default function ConfigEditor({ config }) {
  const { status, draft, errors, dirty, saving, canSave, setField, reset, save, reload } = config;
  const [showPassword, setShowPassword] = useState(false);
  const [showYaml, setShowYaml] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const yamlPreview = useMemo(() => {
    if (!draft) return '';
    const payload = toPayload(draft, '');
    payload.tron.TRON_PASS = draft.tron.TRON_PASS ? '•••••• (新密碼)' : '(沿用原密碼)';
    return toYamlString(payload);
  }, [draft]);

  const bind = (section, key) => ({
    id: key,
    value: draft[section][key],
    error: errors[key],
    onChange: (e) => setField(section, key, e.target.value),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    save();
  };

  return (
    <Card
      title="設定檔"
      icon={Settings2}
      className="flex flex-col"
      actions={
        dirty && (
          <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-400/30">
            未儲存
          </span>
        )
      }
    >
      {status !== 'ready' ? (
        <Placeholder status={status} onRetry={reload} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col" noValidate>
          <div className="divide-y divide-slate-800">
            <Section icon={UserRound} title="Tronclass 帳戶">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="帳號" autoComplete="username" placeholder="學號" {...bind('tron', 'TRON_USER')} />
                <Field
                  label="密碼"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="留空則沿用目前密碼"
                  hint={draft.tron.TRON_PASS ? '儲存後將更換密碼' : undefined}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                      className="px-3 text-slate-500 transition hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  {...bind('tron', 'TRON_PASS')}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <Field label="學校 Tronclass 網址" type="url" placeholder="https://tronclass.ntou.edu.tw" {...bind('tron', 'TRON_BASE_URL')} />
                <Field label="點名輪詢間隔" type="number" min="1000" step="500" inputMode="numeric" suffix="ms" {...bind('tron', 'TRON_INTERVAL')} />
              </div>
            </Section>

            <Section icon={CalendarClock} title="運行時段">
              <div className="grid grid-cols-3 gap-4">
                <HourSelect
                  id="START_HOUR"
                  label="開始"
                  value={draft.scheduler.START_HOUR}
                  onChange={(v) => setField('scheduler', 'START_HOUR', v)}
                />
                <HourSelect
                  id="STOP_HOUR"
                  label="結束"
                  value={draft.scheduler.STOP_HOUR}
                  error={errors.STOP_HOUR}
                  onChange={(v) => setField('scheduler', 'STOP_HOUR', v)}
                />
                <Field label="檢查間隔" type="number" min="1" inputMode="numeric" suffix="分" {...bind('scheduler', 'CHECK_INTERVAL')} />
              </div>
              <ScheduleBar start={Number(draft.scheduler.START_HOUR)} stop={Number(draft.scheduler.STOP_HOUR)} />
            </Section>

            <Section icon={Bell} title="通知">
              <Field
                label="Discord Webhook 網址"
                type="url"
                placeholder="https://discord.com/api/webhooks/…"
                hint="點名結果與排程啟停會通知到這裡;留空則不通知。"
                {...bind('webhook', 'webhook_url')}
              />
            </Section>

            <div className="px-5 py-4">
              <button
                type="button"
                onClick={() => setShowYaml((v) => !v)}
                aria-expanded={showYaml}
                className="flex items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-slate-300"
              >
                <Code2 className="h-3.5 w-3.5" />
                {showYaml ? '隱藏' : '預覽'}將寫入的 YAML
              </button>
              {showYaml && (
                <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950/80 p-4 font-mono text-xs leading-relaxed text-slate-300">
                  {yamlPreview}
                </pre>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 rounded-b-2xl border-t border-slate-800 bg-slate-900/95 px-5 py-3 backdrop-blur">
            <p className="hidden text-xs text-slate-500 sm:block">
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-sans text-[10px] text-slate-400">Ctrl</kbd>
              {' + '}
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-sans text-[10px] text-slate-400">S</kbd>
              {' 儲存 · 修改後需重新啟動程序才會生效'}
            </p>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={!dirty || saving}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" />
                還原
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                儲存
              </button>
            </div>
          </div>
        </form>
      )}
    </Card>
  );
}

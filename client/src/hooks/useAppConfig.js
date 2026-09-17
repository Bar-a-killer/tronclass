import { useCallback, useEffect, useMemo, useState } from 'react';
import { getConfig, saveConfig } from '../api/client.js';
import { normalizeConfig, toDraft, toPayload, validateDraft } from '../utils/config.js';

// saved.tron.TRON_PASS 保存後端目前的明文密碼,只用於「密碼留空 = 沿用」,不可渲染到畫面上。
// 後端 save-config 以整個 section 覆蓋,所以送出時必須把原密碼補回去。
export function useAppConfig(addLog) {
  const [status, setStatus] = useState('loading');
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const config = normalizeConfig(await getConfig());
      setSaved(config);
      setDraft(toDraft(config));
      setStatus('ready');
    } catch (error) {
      addLog(`載入設定失敗:${error.message}`, 'error');
      setStatus('error');
    }
  }, [addLog]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = useCallback((section, key, value) => {
    setDraft((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  }, []);

  const errors = useMemo(() => (draft ? validateDraft(draft) : {}), [draft]);
  const dirty = useMemo(
    () => Boolean(saved && draft) && JSON.stringify(draft) !== JSON.stringify(toDraft(saved)),
    [saved, draft],
  );
  const canSave = dirty && !saving && Object.keys(errors).length === 0;

  const reset = useCallback(() => {
    if (saved) setDraft(toDraft(saved));
  }, [saved]);

  const save = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = toPayload(draft, saved.tron.TRON_PASS);
      await saveConfig(payload);
      const next = normalizeConfig(payload);
      setSaved(next);
      setDraft(toDraft(next));
      addLog('設定已儲存,重新啟動程序後生效', 'success');
    } catch (error) {
      addLog(`儲存設定失敗:${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [addLog, canSave, draft, saved]);

  return { status, draft, errors, dirty, saving, canSave, setField, reset, save, reload: load };
}

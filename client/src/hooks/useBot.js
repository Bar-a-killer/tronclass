import { useCallback, useEffect, useRef, useState } from 'react';
import { me } from '../api/client.js';

const ACTION_LABELS = { start: '開啟自動點名', stop: '停止自動點名', restart: '重新啟動' };
const POLL_MS = 15000;

export function useBot(addLog) {
  const [pending, setPending] = useState(null);
  const [bot, setBot] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const busyRef = useRef(false);

  const refresh = useCallback(async ({ silent = true } = {}) => {
    try {
      setBot(await me.getBot());
      setCheckedAt(new Date());
      if (!silent) addLog('已更新程序狀態', 'info');
    } catch (error) {
      if (!silent) addLog(`無法取得程序狀態:${error.message}`, 'error');
    }
  }, [addLog]);

  const run = useCallback(async (action) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPending(action);
    try {
      if (action === 'refresh') {
        await refresh({ silent: false });
        return;
      }
      setBot(await me.botAction(action));
      setCheckedAt(new Date());
      addLog(`${ACTION_LABELS[action]}完成`, 'success');
    } catch (error) {
      addLog(`${ACTION_LABELS[action]}失敗:${error.message}`, 'error');
    } finally {
      busyRef.current = false;
      setPending(null);
    }
  }, [addLog, refresh]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { pending, bot, checkedAt, run, refresh };
}

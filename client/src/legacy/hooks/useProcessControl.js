import { useCallback, useEffect, useRef, useState } from 'react';
import { runScript } from '../api/client.js';
import { parsePm2List, stripAnsi } from '../utils/pm2.js';

const ACTION_LABELS = { start: '啟動', stop: '暫停', delete: '刪除', list: '重新整理狀態' };

export function useProcessControl(addLog) {
  const [pending, setPending] = useState(null);
  const [processes, setProcesses] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const busyRef = useRef(false);

  const applyList = useCallback((result) => {
    if (result.status === 'error') {
      addLog(`無法取得程序狀態\n${stripAnsi(result.output || '')}`, 'error');
      return;
    }
    const parsed = parsePm2List(result.output || '');
    if (!parsed) addLog(stripAnsi(result.output || '').trim());
    setProcesses(parsed);
    setCheckedAt(new Date());
  }, [addLog]);

  const run = useCallback(async (action, { silent = false } = {}) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPending(action);
    const label = ACTION_LABELS[action];
    try {
      const result = await runScript(action);
      if (action === 'list') {
        applyList(result);
        if (!silent && result.status !== 'error') addLog('已更新程序狀態', 'info');
        return;
      }
      const output = stripAnsi(result.output || '').trim();
      if (result.status === 'error') {
        addLog(`${label}失敗${output ? `\n${output}` : ''}`, 'error');
      } else {
        addLog(`${label}完成`, 'success');
      }
      applyList(await runScript('list'));
    } catch (error) {
      addLog(`${label}時無法連線到後端:${error.message}`, 'error');
    } finally {
      busyRef.current = false;
      setPending(null);
    }
  }, [addLog, applyList]);

  useEffect(() => {
    run('list', { silent: true });
  }, [run]);

  return { pending, processes, checkedAt, run };
}

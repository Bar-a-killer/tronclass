import { useCallback, useState } from 'react';

const MAX_LOGS = 200;
let nextLogId = 0;

export function useLogConsole() {
  const [logs, setLogs] = useState([]);

  const addLog = useCallback((message, type = 'default') => {
    const entry = { id: nextLogId++, time: new Date().toLocaleTimeString('zh-TW', { hour12: false }), message, type };
    setLogs((prev) => [...prev, entry].slice(-MAX_LOGS));
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { logs, addLog, clearLogs };
}

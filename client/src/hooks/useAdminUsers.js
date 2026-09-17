import { useCallback, useEffect, useRef, useState } from 'react';
import { admin } from '../api/client.js';

const POLL_MS = 15000;

export function useAdminUsers() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [pending, setPending] = useState(null);
  const [notice, setNotice] = useState(null);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setUsers(await admin.listUsers());
      setCheckedAt(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // 執行一個管理操作;成功後重新整理列表,結果以 notice 顯示
  const perform = useCallback(async (key, fn, successMessage) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setPending(key);
    try {
      await fn();
      if (successMessage) setNotice({ type: 'success', message: successMessage });
      await refresh();
      return true;
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
      return false;
    } finally {
      busyRef.current = false;
      setPending(null);
    }
  }, [refresh]);

  return { users, error, checkedAt, pending, notice, clearNotice: () => setNotice(null), refresh, perform };
}

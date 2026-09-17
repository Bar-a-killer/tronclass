import { useCallback, useEffect, useState } from 'react';

// 定期讀取點名程式的 log 尾端
export function useLogTail(fetchLog, { intervalMs = 10000, enabled = true } = {}) {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setText(await fetchLog());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchLog]);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    if (!intervalMs) return undefined;
    const timer = setInterval(load, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, load]);

  return { text, error, loading, reload: load };
}

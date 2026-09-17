import { useCallback, useEffect, useState } from 'react';
import { auth, UNAUTHORIZED_EVENT } from '../api/client.js';

export function useAuth() {
  const [state, setState] = useState({ status: 'loading', mode: null, user: null, needsSetup: false });

  const refresh = useCallback(async () => {
    try {
      const result = await auth.state();
      setState({ status: 'ready', mode: result.mode || 'single', user: result.user ?? null, needsSetup: Boolean(result.needsSetup) });
    } catch (error) {
      setState({ status: 'error', mode: null, user: null, needsSetup: false, error: error.message });
    }
  }, []);

  useEffect(() => {
    refresh();
    const onUnauthorized = () => setState((prev) => ({ ...prev, user: null }));
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [refresh]);

  const login = useCallback(async (username, password, { setup = false } = {}) => {
    const result = setup ? await auth.setup(username, password) : await auth.login(username, password);
    setState((prev) => ({ ...prev, status: 'ready', user: result.user, needsSetup: false }));
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      setState((prev) => ({ ...prev, user: null }));
    }
  }, []);

  return { ...state, login, logout, refresh };
}

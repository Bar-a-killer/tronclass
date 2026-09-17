import { useCallback, useEffect, useState } from 'react';

const current = () => window.location.hash.replace(/^#\/?/, '') || 'dashboard';

export function useHashRoute() {
  const [route, setRoute] = useState(current);

  useEffect(() => {
    const onChange = () => setRoute(current());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next) => {
    window.location.hash = next === 'dashboard' ? '' : `/${next}`;
  }, []);

  return [route, navigate];
}

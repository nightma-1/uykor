import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Loads data once, with pull-to-refresh and a retry after errors. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useRef(fn);
  useLayoutEffect(() => { fnRef.current = fn; });

  const run = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    try {
      setData(await fnRef.current());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetching on mount / when deps change is the point of this hook.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { run(); }, deps);

  return { data, error, loading, refreshing, reload: () => run(false), refresh: () => run(true) };
}

import { useCallback, useEffect, useState } from 'react';

/**
 * Runs an API call and tracks loading, error and data so every page handles
 * those three states the same way.
 *
 *   const { data, loading, error, reload } = useApi(() => api.books.list(), [page]);
 */
export function useApi(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const run = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve(fn())
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (!cancelled) setState({ data: null, loading: false, error }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(run, [run]);

  return { ...state, reload: run };
}

/**
 * For actions rather than page loads: submitting a form, issuing a book.
 * Returns a `run` you await, plus the busy flag and any error.
 */
export function useAction(fn) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (...args) => {
    setBusy(true);
    setError(null);
    try {
      return await fn(...args);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setBusy(false);
    }
  }, [fn]);

  return { run, busy, error, setError };
}

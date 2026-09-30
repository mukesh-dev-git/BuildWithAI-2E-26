// Client for the /api/v2 aggregate endpoints.
import { useEffect, useState } from 'react';

const BASE = '/api/v2';

export async function apiGet(path, params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== ''));
  const res = await fetch(`${BASE}${path}${qs.size ? `?${qs}` : ''}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Request failed (${res.status})`);
  return res.json();
}

/** Fetches `path` whenever params change (skipped when path is null). Returns { data, error, loading, reload }. */
export function useApi(path, params = {}) {
  const key = JSON.stringify([path, params]);
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) { setState({ data: null, error: null, loading: false }); return undefined; }
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    apiGet(path, params)
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: null, error, loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}

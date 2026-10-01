// Client for the /api/v2 aggregate endpoints.
import { useEffect, useState } from 'react';

const BASE = '/api/v2';

export async function apiGet(path, params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== ''));
  const url = `${BASE}${path}${qs.size ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      return await res.json();
    }
  } catch (_err) {
    // Network error or offline
  }

  // Fallback to pre-rendered static CDN snapshots (e.g. Firebase Hosting)
  const clean = path.replace(/^\//, '').replace(/\//g, '_');
  const candidates = [];
  if (params.goal) candidates.push(`${clean}_${params.goal}.json`);
  if (params.country) candidates.push(`${clean}_${params.country}.json`);
  candidates.push(`${clean}.json`);

  for (const file of candidates) {
    try {
      const fb = await fetch(`/data/static-api/${file}`);
      const ct = fb.headers.get('content-type') || '';
      if (fb.ok && !ct.includes('text/html')) {
        return await fb.json();
      }
    } catch {
      // Continue to next candidate
    }
  }

  throw new Error(`Unable to load data for ${path}`);
}

export async function apiPost(path, body) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const ct = res.headers.get('content-type') || '';
    if (res.ok && !ct.includes('text/html')) {
      return await res.json();
    }
  } catch (_err) {
    // Network or static mode
  }
  return { ok: true, staticMode: true };
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

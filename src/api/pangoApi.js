import { Platform } from 'react-native';
import { createSseParser } from '../utils/sse';

const productionBase = 'https://pango.fun';

export function getApiBase() {
  const envBase = process.env.EXPO_PUBLIC_PANGO_API_BASE;
  if (envBase !== undefined) return envBase.replace(/\/$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { protocol, host, hostname } = window.location;
    if (hostname === 'pango.fun' || hostname.endsWith('.pango.fun')) return '';
    if (hostname === '127.0.0.1' && host.endsWith(':4173')) return '';
    if (hostname === 'localhost' && host.endsWith(':4173')) return '';
    if (protocol === 'https:') return '';
  }

  return productionBase;
}

export function apiUrl(path) {
  const base = getApiBase();
  return `${base}${path}`;
}

function decodeChunk(value, decoder) {
  if (decoder) return decoder.decode(value, { stream: true });
  if (typeof Buffer !== 'undefined') return Buffer.from(value).toString('utf8');
  return Array.from(value || [])
    .map((byte) => String.fromCharCode(byte))
    .join('');
}

export async function apiFetch(path, options = {}) {
  const headers = {
    accept: 'application/json',
    ...(options.headers || {}),
  };

  return fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
    headers,
  });
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function login(username, password) {
  const res = await apiFetch('/api/pango/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function me() {
  const res = await apiFetch('/api/pango/me', { cache: 'no-store' });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function logout(csrf) {
  await apiFetch('/api/pango/logout', {
    method: 'POST',
    headers: csrf ? { 'x-pango-csrf': csrf } : {},
  }).catch(() => null);
}

export async function status() {
  const res = await apiFetch('/api/pango/status', { cache: 'no-store' });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function sessions() {
  const res = await apiFetch('/api/pango/sessions?limit=30&source=all', { cache: 'no-store' });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.sessions || [];
}

export async function tasks() {
  const res = await apiFetch('/api/pango/tasks', { cache: 'no-store' });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function config() {
  const res = await apiFetch('/api/pango/config', { cache: 'no-store' });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function streamChat({ message, sessionId, csrf, onEvent }) {
  const res = await apiFetch('/api/pango/chat/stream', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      'x-pango-csrf': csrf,
    },
    body: JSON.stringify({ message, session_id: sessionId || '' }),
  });

  if (!res.ok) {
    const data = await readJson(res);
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  const parser = createSseParser(onEvent);

  if (res.body?.getReader) {
    const reader = res.body.getReader();
    const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.push(decodeChunk(value, decoder));
    }
    parser.flush();
    return;
  }

  const text = await res.text();
  parser.push(text);
  parser.flush();
}

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const root = resolve(new URL('.', import.meta.url).pathname);
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const apiUpstream = process.env.PANGO_API_UPSTREAM ? new URL(process.env.PANGO_API_UPSTREAM) : null;
const apiMode = apiUpstream ? 'proxy' : 'mock';
const configuredUser = process.env.PANGO_LOCAL_USER;
const configuredPassword = process.env.PANGO_LOCAL_PASSWORD;
const startedAt = Date.now();
const cookieName = 'pango_dev_session';

const sessions = new Map();
const chatSessions = new Map([
  [
    'local-session-1',
    [
      {
        role: 'system',
        content: 'Local dev mode aktif. Endpoint /api/pango/* disediakan oleh dev-server.mjs.',
        timestamp: Math.floor(Date.now() / 1000) - 90,
      },
      {
        role: 'assistant',
        content: 'Login lokal berhasil. Ini bukan Hermes production bridge.',
        timestamp: Math.floor(Date.now() / 1000) - 60,
        token_count: 42,
      },
    ],
  ],
]);
const approvals = [];
const snapshots = [
  {
    id: 'local-snapshot-001',
    reason: 'local-dev-seed',
    size_bytes: 16384,
    created_at: Math.floor(Date.now() / 1000) - 300,
  },
];
const promotedTasks = [];
const events = [
  {
    ts: Math.floor(Date.now() / 1000) - 30,
    kind: 'local.dev.ready',
    session_id: 'local-session-1',
    tool_name: 'dev-server',
  },
];

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return;
  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('access-control-allow-credentials', 'true');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type,x-pango-csrf');
  res.setHeader('vary', 'Origin');
}

function redirect(res, location) {
  res.writeHead(302, {
    location,
    'cache-control': 'no-store',
  });
  res.end();
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function currentSession(req) {
  const sid = parseCookies(req)[cookieName];
  if (!sid) return null;
  const session = sessions.get(sid);
  if (!session) return null;
  session.sid = sid;
  session.lastSeen = Date.now();
  return session;
}

function makeSession(username, extra = {}) {
  const sid = randomUUID();
  const csrf = extra.csrf || randomUUID();
  sessions.set(sid, {
    username,
    csrf,
    ...extra,
    createdAt: Date.now(),
    lastSeen: Date.now(),
  });
  return { sid, username, csrf };
}

function sessionCookie(sid, maxAge = 28800) {
  return `${cookieName}=${encodeURIComponent(sid)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function readBody(req) {
  const raw = await readRawBody(req);
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function checkCsrf(req, session) {
  return Boolean(session?.csrf && req.headers['x-pango-csrf'] === session.csrf);
}

function requireAuth(req, res) {
  const session = currentSession(req);
  if (!session) {
    sendJson(res, 401, { ok: false, error: 'auth_required' });
    return null;
  }
  return session;
}

function requireCsrf(req, res, session) {
  if (!checkCsrf(req, session)) {
    sendJson(res, 403, { ok: false, error: 'csrf_required' });
    return false;
  }
  return true;
}

async function serveStatic(req, res, pathname) {
  const session = currentSession(req);
  let routePath = pathname === '/' ? '/index.html' : pathname;
  if (routePath === '/login') routePath = '/login.html';

  if (routePath === '/index.html' && !session) {
    redirect(res, '/login?next=/');
    return;
  }

  const filePath = resolve(join(root, routePath.replace(/^\/+/, '')));
  if (!filePath.startsWith(root)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'cache-control': routePath === '/sw.js' ? 'no-cache' : 'no-store',
    });
    createReadStream(filePath).pipe(res);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

function baseSessions() {
  return [
    {
      id: 'local-session-1',
      source: 'local',
      title: 'Local dev smoke session',
      preview: 'Mocked session history from dev-server.mjs',
      model: 'local-mock',
      message_count: chatSessions.get('local-session-1')?.length || 0,
      input_tokens: 120,
      output_tokens: 80,
    },
    ...Array.from(chatSessions.entries())
      .filter(([id]) => id !== 'local-session-1')
      .map(([id, messages]) => ({
        id,
        source: 'local',
        title: 'Local chat session',
        preview: messages.at(-1)?.content || id,
        model: 'local-mock',
        message_count: messages.length,
        input_tokens: messages.length * 20,
        output_tokens: messages.length * 30,
      })),
  ];
}

function tasksPayload() {
  return {
    ok: true,
    board: { kanban_task_count: promotedTasks.length, kanban_error: '' },
    bridge: { active_runs: 0, max_active_runs: 2 },
    cron: { job_count: 0, preview: 'Local dev server tidak menjalankan cron production.' },
    recent_sessions: baseSessions(),
    lanes: {
      queue: promotedTasks.filter((task) => task.status === 'ready'),
      running: [],
      blocked: [],
      done: [
        {
          id: 'local-done-1',
          title: 'Local auth mock',
          body: 'Cookie + CSRF route tersedia untuk development.',
          assignee: 'dev-server',
          status: 'done',
          metrics: { model: 'node:http', messages: 1, tokens: 0 },
        },
      ],
    },
  };
}

function configPayload() {
  return {
    ok: true,
    gateway: {
      state: 'local_mock',
      active_agents: 0,
      gateway_busy: false,
      platforms: {
        browser: { state: 'local', updated_at: new Date().toISOString() },
      },
    },
    profiles: {
      profiles: [{ name: 'local-dev', model: 'mock-api', active: true }],
    },
    credentials: {
      providers: [{ provider: 'local-dev', count: 0 }],
      env_key_names: [],
    },
    analytics: {
      session_count: chatSessions.size,
      message_count: Array.from(chatSessions.values()).reduce((sum, messages) => sum + messages.length, 0),
      token_count: 0,
      by_source: { local: chatSessions.size },
    },
    toolsets: {
      enabled: [{ name: 'local-dev-server', label: 'Mock pango.fun API', tools: ['auth', 'chat', 'status'] }],
    },
  };
}

function statusPayload() {
  const uptime = Math.floor((Date.now() - startedAt) / 1000);
  return {
    ok: true,
    status: 'online',
    backend: 'local-dev',
    cpu: { percent: 7 },
    memory: { percent: 31, used: 512 * 1024 * 1024, available: 1536 * 1024 * 1024 },
    disk_hermes: { percent: 12, used: 1024 * 1024 * 1024, free: 7 * 1024 * 1024 * 1024 },
    uptime_seconds: uptime,
    load_average: { '1m': 0.12, '5m': 0.18, '15m': 0.2 },
    hermes: { summary: 'Local pango.fun mock API', update_state: 'local_dev' },
    services: {
      'pango-dev-server': 'active',
      'mock-auth': 'active',
      'mock-gateway': 'active',
    },
  };
}

async function writeSse(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function upstreamUrlFor(url) {
  if (!apiUpstream) throw new Error('missing_upstream');
  return new URL(`${url.pathname}${url.search}`, apiUpstream).toString();
}

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const value = headers.get('set-cookie');
  return value ? [value] : [];
}

function cookieHeaderFromSetCookies(setCookies) {
  return setCookies
    .map((cookie) => String(cookie).split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

function mergeCookieHeader(currentCookie, setCookies) {
  const jar = new Map();
  String(currentCookie || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const index = part.indexOf('=');
      if (index !== -1) jar.set(part.slice(0, index), part.slice(index + 1));
    });
  cookieHeaderFromSetCookies(setCookies)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const index = part.indexOf('=');
      if (index !== -1) jar.set(part.slice(0, index), part.slice(index + 1));
    });
  return Array.from(jar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function proxyResponseHeaders(upstreamRes, extra = {}) {
  const headers = {
    'cache-control': upstreamRes.headers.get('cache-control') || 'no-store',
    ...extra,
  };
  const contentType = upstreamRes.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  return headers;
}

function proxyRequestHeaders(req, session, hasBody) {
  const headers = {
    accept: req.headers.accept || '*/*',
    'user-agent': 'pango.fun-local-dev-proxy',
  };
  if (hasBody && req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
  if (session?.upstreamCookie) headers.cookie = session.upstreamCookie;
  if (session?.upstreamCsrf || session?.csrf) headers['x-pango-csrf'] = session.upstreamCsrf || session.csrf;
  return headers;
}

async function sendUpstreamBody(upstreamRes, res) {
  if (!upstreamRes.body) {
    res.end();
    return;
  }
  for await (const chunk of upstreamRes.body) res.write(chunk);
  res.end();
}

async function fetchUpstreamMe(session) {
  const upstreamRes = await fetch(new URL('/api/pango/me', apiUpstream), {
    method: 'GET',
    headers: proxyRequestHeaders({ headers: {} }, session, false),
  });
  const text = await upstreamRes.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }
  const setCookies = getSetCookies(upstreamRes.headers);
  if (setCookies.length) session.upstreamCookie = mergeCookieHeader(session.upstreamCookie, setCookies);
  if (data.csrf) {
    session.upstreamCsrf = data.csrf;
    session.csrf = data.csrf;
  }
  return { upstreamRes, data, text };
}

async function handleProxyApi(req, res, url) {
  const { pathname } = url;

  if (pathname === '/api/pango/login' && req.method === 'POST') {
    const rawBody = await readRawBody(req);
    const upstreamRes = await fetch(upstreamUrlFor(url), {
      method: 'POST',
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
        accept: 'application/json',
        'user-agent': 'pango.fun-local-dev-proxy',
      },
      body: rawBody,
    });
    const text = await upstreamRes.text();
    const setCookies = getSetCookies(upstreamRes.headers);
    const upstreamCookie = cookieHeaderFromSetCookies(setCookies);

    if (!upstreamRes.ok) {
      res.writeHead(upstreamRes.status, proxyResponseHeaders(upstreamRes));
      res.end(text);
      return;
    }

    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
    const username = (() => {
      try {
        return JSON.parse(rawBody).username || data.user?.username || 'production-user';
      } catch {
        return data.user?.username || 'production-user';
      }
    })();
    const session = makeSession(username, {
      csrf: data.csrf || randomUUID(),
      upstreamCookie,
      upstreamCsrf: data.csrf || '',
      mode: 'proxy',
    });

    if (!session.upstreamCsrf && session.upstreamCookie) {
      await fetchUpstreamMe(sessions.get(session.sid));
    }

    const body = JSON.stringify({
      ...data,
      ok: data.ok !== false,
      csrf: sessions.get(session.sid)?.csrf || session.csrf,
      mode: 'production-proxy',
    });
    res.writeHead(200, {
      ...proxyResponseHeaders(upstreamRes, { 'content-type': 'application/json; charset=utf-8' }),
      'set-cookie': sessionCookie(session.sid),
    });
    res.end(body);
    return;
  }

  const session = requireAuth(req, res);
  if (!session) return;

  if (pathname === '/api/pango/me' && req.method === 'GET') {
    const { upstreamRes, data, text } = await fetchUpstreamMe(session);
    res.writeHead(upstreamRes.status, proxyResponseHeaders(upstreamRes, { 'content-type': 'application/json; charset=utf-8' }));
    if (upstreamRes.ok) {
      res.end(JSON.stringify({ ...data, csrf: session.csrf, mode: 'production-proxy' }));
    } else {
      res.end(text);
    }
    return;
  }

  if (pathname === '/api/pango/logout' && req.method === 'POST') {
    if (checkCsrf(req, session)) {
      await fetch(upstreamUrlFor(url), {
        method: 'POST',
        headers: proxyRequestHeaders(req, session, false),
      }).catch(() => null);
    }
    sessions.delete(session.sid);
    sendJson(res, 200, { ok: true }, { 'set-cookie': sessionCookie('', 0) });
    return;
  }

  const hasBody = !['GET', 'HEAD'].includes(req.method || 'GET');
  if (hasBody && !requireCsrf(req, res, session)) return;
  const rawBody = hasBody ? await readRawBody(req) : undefined;
  const upstreamRes = await fetch(upstreamUrlFor(url), {
    method: req.method,
    headers: proxyRequestHeaders(req, session, hasBody),
    body: rawBody,
  });

  const setCookies = getSetCookies(upstreamRes.headers);
  if (setCookies.length) session.upstreamCookie = mergeCookieHeader(session.upstreamCookie, setCookies);

  res.writeHead(upstreamRes.status, proxyResponseHeaders(upstreamRes));
  await sendUpstreamBody(upstreamRes, res);
}

async function handleApi(req, res, url) {
  if (apiMode === 'proxy') {
    await handleProxyApi(req, res, url);
    return;
  }

  const { pathname, searchParams } = url;

  if (pathname === '/api/pango/login' && req.method === 'POST') {
    const body = await readBody(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const hasConfiguredCreds = Boolean(configuredUser || configuredPassword);
    const valid = hasConfiguredCreds
      ? username === (configuredUser || '') && password === (configuredPassword || '')
      : Boolean(username && password);

    if (!valid) {
      sendJson(res, 401, { ok: false, error: 'identity_rejected' });
      return;
    }

    const session = makeSession(username);
    sendJson(
      res,
      200,
      { ok: true, user: { username }, csrf: session.csrf, mode: 'local-dev' },
      { 'set-cookie': sessionCookie(session.sid) },
    );
    return;
  }

  if (pathname === '/api/pango/me' && req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;
    sendJson(res, 200, {
      ok: true,
      user: { username: session.username, mode: 'local-dev' },
      csrf: session.csrf,
    });
    return;
  }

  const session = requireAuth(req, res);
  if (!session) return;

  if (pathname === '/api/pango/logout' && req.method === 'POST') {
    sessions.delete(session.sid);
    sendJson(res, 200, { ok: true }, { 'set-cookie': sessionCookie('', 0) });
    return;
  }

  if (pathname === '/api/pango/status' && req.method === 'GET') {
    sendJson(res, 200, statusPayload());
    return;
  }

  if (pathname === '/api/pango/sessions' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, sessions: baseSessions() });
    return;
  }

  if (pathname === '/api/pango/messages' && req.method === 'GET') {
    const sessionId = searchParams.get('session_id') || 'local-session-1';
    sendJson(res, 200, { ok: true, session_id: sessionId, messages: chatSessions.get(sessionId) || [] });
    return;
  }

  if (pathname === '/api/pango/tasks' && req.method === 'GET') {
    sendJson(res, 200, tasksPayload());
    return;
  }

  if (pathname === '/api/pango/config' && req.method === 'GET') {
    sendJson(res, 200, configPayload());
    return;
  }

  if (pathname === '/api/pango/ops/quality' && req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      quality: {
        ok: true,
        mode: 'local-dev',
        ts: Math.floor(Date.now() / 1000),
        elapsed_ms: 8,
        checks: {
          services: { ok: true },
          syntax: { html: { ok: true }, api: { ok: true } },
          no_secret_scan: { api_server_key_exposed: false },
          manifest: { ok: true },
          sw: { ok: true },
        },
        failures: [],
      },
    });
    return;
  }

  if (pathname === '/api/pango/ops/events' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, events: events.slice(-Number(searchParams.get('limit') || 80)).reverse() });
    return;
  }

  if (pathname === '/api/pango/chat/stream' && req.method === 'POST') {
    if (!requireCsrf(req, res, session)) return;
    const body = await readBody(req);
    const message = String(body.message || '').trim();
    const sessionId = body.session_id || `local-${randomUUID().slice(0, 8)}`;
    const history = chatSessions.get(sessionId) || [];
    const now = Math.floor(Date.now() / 1000);
    history.push({ role: 'user', content: message, timestamp: now });
    const reply = `Local dev response: "${message || 'empty message'}" diterima. Untuk Hermes production, jalankan gateway asli di server pango.fun.`;
    history.push({ role: 'assistant', content: reply, timestamp: now + 1, token_count: 64, finish_reason: 'stop' });
    chatSessions.set(sessionId, history);
    events.push({ ts: now, kind: 'assistant.completed', session_id: sessionId, tool_name: 'local-chat' });

    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    await writeSse(res, 'bridge.started', { ok: true, session_id: sessionId });
    const chunks = reply.match(/.{1,36}(\s|$)/g) || [reply];
    for (const chunk of chunks) {
      await delay(45);
      await writeSse(res, 'assistant.delta', { session_id: sessionId, delta: chunk });
    }
    await writeSse(res, 'assistant.completed', { session_id: sessionId, content: reply });
    await writeSse(res, 'run.completed', { session_id: sessionId, usage: { total_tokens: 64 } });
    await writeSse(res, 'bridge.completed', { session_id: sessionId, elapsed_ms: 280 });
    res.end();
    return;
  }

  if (pathname === '/api/pango/tasks/promote' && req.method === 'POST') {
    if (!requireCsrf(req, res, session)) return;
    const body = await readBody(req);
    const task = {
      id: `local-task-${randomUUID().slice(0, 8)}`,
      title: String(body.title || 'Local task').slice(0, 140),
      body: String(body.body || '').slice(0, 3500),
      session_id: body.session_id || '',
      assignee: 'local-dev',
      status: 'ready',
    };
    promotedTasks.push(task);
    sendJson(res, 201, { ok: true, task_id: task.id, task });
    return;
  }

  if (pathname === '/api/pango/ops/approvals' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, approvals });
    return;
  }

  if (pathname === '/api/pango/ops/approval' && req.method === 'POST') {
    if (!requireCsrf(req, res, session)) return;
    const body = await readBody(req);
    const approval = {
      id: `appr_${randomUUID().slice(0, 12)}`,
      status: 'pending',
      action_type: body.action_type || 'snapshot',
      title: body.title || 'Local approval',
      detail: body.detail || '',
      payload: body.payload || {},
    };
    approvals.unshift(approval);
    sendJson(res, 201, { ok: true, approval });
    return;
  }

  if (pathname === '/api/pango/ops/approval/resolve' && req.method === 'POST') {
    if (!requireCsrf(req, res, session)) return;
    const body = await readBody(req);
    const approval = approvals.find((item) => item.id === body.approval_id);
    if (!approval) {
      sendJson(res, 404, { ok: false, error: 'approval_not_found' });
      return;
    }
    const required = approval.action_type === 'rollback' ? `ROLLBACK ${approval.payload?.snapshot_id || ''}` : `APPROVE ${approval.id}`;
    if (body.decision === 'approve' && body.confirm !== required) {
      sendJson(res, 400, { ok: false, error: 'confirm_mismatch', required_confirm: required });
      return;
    }
    approval.status = body.decision === 'approve' ? 'approved' : 'declined';
    sendJson(res, 200, { ok: true, approval });
    return;
  }

  if (pathname === '/api/pango/ops/snapshots' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, snapshots });
    return;
  }

  if (pathname === '/api/pango/ops/snapshot' && req.method === 'POST') {
    if (!requireCsrf(req, res, session)) return;
    const snapshot = {
      id: `local-snapshot-${randomUUID().slice(0, 8)}`,
      reason: 'manual-local-dev',
      size_bytes: 32768,
      created_at: Math.floor(Date.now() / 1000),
    };
    snapshots.unshift(snapshot);
    sendJson(res, 201, { ok: true, snapshot });
    return;
  }

  if (pathname === '/api/pango/ops/rollback' && req.method === 'POST') {
    if (!requireCsrf(req, res, session)) return;
    const body = await readBody(req);
    if (body.dry_run) {
      sendJson(res, 200, { ok: true, preview: { snapshot_id: body.snapshot_id, files: ['index.html', 'login.html'] } });
      return;
    }
    if (body.confirm !== `ROLLBACK ${body.snapshot_id}`) {
      sendJson(res, 400, { ok: false, error: 'confirm_mismatch' });
      return;
    }
    sendJson(res, 200, { ok: true, restored: ['index.html'], pre_rollback_snapshot: 'local-pre-rollback' });
    return;
  }

  sendJson(res, 404, { ok: false, error: 'not_found' });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);
    applyCors(req, res);
    if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/pango/')) {
      res.writeHead(204, { 'cache-control': 'no-store' });
      res.end();
      return;
    }
    if (url.pathname.startsWith('/api/pango/')) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { ok: false, error: 'internal_error' });
  }
});

server.listen(port, host, () => {
  console.log(`pango.fun local dev server running at http://${host}:${port}`);
  if (apiUpstream) {
    console.log(`api mode: production proxy -> ${apiUpstream.origin}`);
    console.log('local auth: credentials are forwarded to upstream; upstream cookies stay in memory');
  } else if (configuredUser || configuredPassword) {
    console.log('api mode: local mock');
    console.log('local auth: using PANGO_LOCAL_USER/PANGO_LOCAL_PASSWORD');
  } else {
    console.log('api mode: local mock');
    console.log('local auth: any non-empty username/password is accepted');
  }
});

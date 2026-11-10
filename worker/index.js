import {
  GOOGLE_APPS,
  USER_AGENT,
  fetchDashboard,
  mergeSessionCookie,
  parseDashboard,
} from './scraper.js';
import { BUNDLED_ICONS } from './icons.js';

const DASH = 'https://sso.unesa.ac.id/dashboard';
const SESSION_TTL = 60 * 24 * 60 * 60;
const SID_RE = /^[A-Za-z0-9_-]{20,80}$/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/next' || path.startsWith('/next/')) {
        const rest = path.slice('/next'.length);
        return redirect((rest.startsWith('/') ? rest : '/' + rest) + url.search);
      }

      if (path === '/legacy') return redirect('/legacy/' + url.search);

      if (path === '/api/state') return await stateHandler(request, env);
      if (path === '/api/connect' && request.method === 'POST') return await connectHandler(request, env);
      if (path === '/api/refresh' && request.method === 'POST') return await refreshHandler(request, env);
      if (path === '/api/logout' && request.method === 'POST') return await logoutHandler(request, env);
      if (path.startsWith('/go/')) return await launchHandler(request, env, path);
      if (path.startsWith('/icon/')) return await iconHandler(request, env, path);
    } catch (err) {
      return json({ error: err && err.message ? err.message : 'Server error' }, 500);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(warmSessions(env));
  },
};

/* ---------------- handlers ---------------- */

async function stateHandler(request, env) {
  const session = await readSession(env, request);
  return json(publicState(session), 200);
}

async function connectHandler(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Body tidak valid.' }, 400);
  }

  const raw = String((body && body.cookie) || '').trim();
  const cookie = normalizeCookie(raw);
  if (!cookie) {
    return json({ ok: false, error: 'Cookie kosong.' }, 400);
  }
  if (!/laravel_session=/.test(cookie)) {
    return json({ ok: false, error: 'Cookie harus berisi laravel_session.' }, 400);
  }

  const result = await fetchDashboard(cookie);
  if (result.unauthorized) {
    return json(
      {
        ok: false,
        error:
          'Cookie tidak valid atau sesi sudah habis. Login ulang di sso.unesa.ac.id, lalu copy Cookie header yang baru.',
      },
      401
    );
  }

  const parsed = parseDashboard(result.html);
  if (!parsed.apps.length) {
    return json({ ok: false, error: 'Gagal membaca dashboard. Coba lagi.' }, 422);
  }

  const existing = await readSession(env, request);
  const sid = existing ? existing.sid : randomId();
  const state = toState(parsed);
  const nextCookie = mergeSessionCookie(cookie, result.setCookies);

  await writeSession(env, sid, {
    cookie: nextCookie,
    state,
    createdAt: existing && existing.createdAt ? existing.createdAt : Date.now(),
  });

  return json(
    { ok: true, state: publicState({ sid, state, cookie: nextCookie }) },
    200,
    { 'Set-Cookie': sidCookie(sid) }
  );
}

async function refreshHandler(request, env) {
  const session = await readSession(env, request);
  if (!session) return json({ ok: false, error: 'Belum terhubung.' }, 401);

  const result = await fetchDashboard(session.cookie);
  if (result.unauthorized) {
    const state = { ...session.state, authenticated: false, updatedAt: Date.now() };
    await writeSession(env, session.sid, { ...session, state });
    return json({ ok: false, needsLogin: true, state: publicState({ ...session, state }) });
  }

  const parsed = parseDashboard(result.html);
  const state = toState(parsed);
  const cookie = mergeSessionCookie(session.cookie, result.setCookies);
  await writeSession(env, session.sid, { ...session, cookie, state });
  return json({ ok: true, state: publicState({ ...session, cookie, state }) });
}

async function logoutHandler(request, env) {
  const sid = getSid(request);
  if (sid && SID_RE.test(sid)) {
    await env.SSO_KV.delete('s:' + sid);
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearSidCookie() });
}

async function launchHandler(request, env, path) {
  const session = await readSession(env, request);
  if (!session) return redirect('/');

  const id = decodeURIComponent(path.slice('/go/'.length));
  if (!id) return redirect('/?status=expired');

  const bookmark = (session.state.google || []).find((app) => app.id === id) ||
    GOOGLE_APPS.find((app) => app.id === id);
  if (bookmark && bookmark.url) return redirect(bookmark.url);

  const result = await fetchDashboard(session.cookie);
  if (result.unauthorized) {
    const state = { ...session.state, authenticated: false, updatedAt: Date.now() };
    await writeSession(env, session.sid, { ...session, state });
    return redirect('/?status=expired');
  }

  const parsed = parseDashboard(result.html);
  const app = parsed.apps.find((entry) => entry.id === id);
  if (!app || !app.url) return redirect('/?status=expired');

  const cookie = mergeSessionCookie(session.cookie, result.setCookies);
  if (cookie !== session.cookie) {
    await writeSession(env, session.sid, { ...session, cookie });
  }

  return redirect(app.url);
}

async function iconHandler(request, env, path) {
  const rel = decodeURIComponent(path.slice('/icon/'.length));
  if (!/^[a-z0-9/_.-]+\.(png|svg|webp|ico)$/i.test(rel)) {
    return new Response('Not found', { status: 404 });
  }

  const remote = 'https://sso.unesa.ac.id/img/icon-app/' + rel;
  const cache = caches.default;
  const cacheKey = new Request(remote, { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const res = await fetch(remote, {
    headers: {
      'user-agent': USER_AGENT,
      referer: 'https://sso.unesa.ac.id/dashboard',
    },
    cf: { cacheEverything: true, cacheTtl: 31536000 },
  });

  if (!res.ok) return new Response('Not found', { status: 404 });

  const out = new Response(res.body, {
    status: 200,
    headers: {
      'content-type': res.headers.get('content-type') || 'image/png',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
  await cache.put(cacheKey, out.clone());
  return out;
}

/* ---------------- scraping state ---------------- */

function appIcon(app) {
  if (BUNDLED_ICONS[app.id]) return '/app-icons/' + BUNDLED_ICONS[app.id];
  return app.icon || null;
}

function toState(parsed) {
  return {
    authenticated: true,
    email: parsed.email,
    name: parsed.name,
    nim: parsed.nim,
    apps: parsed.apps.map((app) => ({
      id: app.id,
      title: app.title,
      desc: app.desc,
      host: app.host,
      icon: appIcon(app),
    })),
    google: parsed.google.map((app) => ({
      id: app.id,
      title: app.title,
      desc: '',
      host: app.host,
      icon: appIcon(app),
      url: app.url,
    })),
    info: parsed.info,
    updatedAt: Date.now(),
  };
}

function publicState(session) {
  if (!session || !session.state) {
    return {
      mode: 'edge',
      ready: true,
      authenticated: false,
      connecting: false,
      error: null,
      email: null,
      name: null,
      nim: null,
      apps: [],
      google: [],
      info: [],
      updatedAt: 0,
    };
  }

  const state = session.state;
  return {
    mode: 'edge',
    ready: true,
    connecting: false,
    error: null,
    authenticated: Boolean(state.authenticated),
    email: state.email || null,
    name: state.name || null,
    nim: state.nim || null,
    apps: state.apps || [],
    google: state.google || [],
    info: state.info || [],
    updatedAt: state.updatedAt || 0,
  };
}

/* ---------------- sessions ---------------- */

async function readSession(env, request) {
  const sid = getSid(request);
  if (!sid || !SID_RE.test(sid)) return null;
  const data = await env.SSO_KV.get('s:' + sid, 'json');
  if (!data || !data.cookie) return null;
  return { sid, ...data };
}

async function writeSession(env, sid, data) {
  await env.SSO_KV.put('s:' + sid, JSON.stringify(data), { expirationTtl: SESSION_TTL });
}

function getSid(request) {
  const header = request.headers.get('cookie') || '';
  const match = header.match(/(?:^|;\s*)sso_sid=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function sidCookie(sid) {
  return `sso_sid=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`;
}

function clearSidCookie() {
  return 'sso_sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

function randomId() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function normalizeCookie(input) {
  if (!input) return '';
  let cookie = input.replace(/^cookie:\s*/i, '').trim();
  cookie = cookie.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join('; ');
  if (!/laravel_session=/.test(cookie) && /^[A-Za-z0-9%]+$/.test(cookie)) {
    cookie = 'laravel_session=' + cookie;
  }
  return cookie.split(/;\s*/).filter(Boolean).join('; ');
}

/* ---------------- keep-warm ---------------- */

async function warmSessions(env) {
  let cursor;
  do {
    const page = await env.SSO_KV.list({ prefix: 's:', cursor });
    const entries = [];
    for (const key of page.keys) {
      const data = await env.SSO_KV.get(key.name, 'json');
      if (data && data.cookie && data.state && data.state.authenticated !== false) {
        entries.push({ key: key.name, ...data });
      }
    }

    for (let i = 0; i < entries.length; i += 5) {
      await Promise.all(entries.slice(i, i + 5).map((entry) => warmOne(env, entry)));
    }

    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
}

async function warmOne(env, session) {
  try {
    const res = await fetch(DASH, {
      headers: {
        cookie: session.cookie,
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'id-ID,id;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });

    if (/\/login(\?|$)/.test(res.url || '') || /accounts\.google\.com/.test(res.url || '')) {
      const state = { ...session.state, authenticated: false, updatedAt: Date.now() };
      await env.SSO_KV.put(
        session.key,
        JSON.stringify({ cookie: session.cookie, state, createdAt: session.createdAt }),
        { expirationTtl: SESSION_TTL }
      );
      return;
    }

    const nextCookie = mergeSessionCookie(session.cookie, readSetCookies(res.headers));
    if (nextCookie !== session.cookie) {
      await env.SSO_KV.put(
        session.key,
        JSON.stringify({ ...session, cookie: nextCookie }),
        { expirationTtl: SESSION_TTL }
      );
    }

    if (res.body) await res.body.cancel().catch(() => {});
  } catch {
    /* retry next cron */
  }
}

function readSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    try {
      return headers.getSetCookie();
    } catch {
      /* ignore */
    }
  }
  const raw = headers.get('set-cookie');
  return raw ? [raw] : [];
}

/* ---------------- misc ---------------- */

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: { location, 'cache-control': 'no-store' },
  });
}

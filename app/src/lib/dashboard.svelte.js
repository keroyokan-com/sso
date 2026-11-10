import { readJson, writeJson } from './storage.js';
import { readStoredLinks, refreshLinks } from './links.svelte.js';
import { appsFromCatalog, googleFromCatalog } from './dashboard-data.js';
import { showToast } from './toast.svelte.js';

const FAV_KEY = 'sso.favs';
const CATALOG_KEY = 'sso.catalog';
const STATE_KEY = 'sso.state';
const POLL_MS = 2000;
const POLL_MAX_MS = 8 * 60 * 1000;
const READY_POLL_MS = 1500;
const READY_MAX_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 10000;
const REFRESH_TIMEOUT_MS = 20000;

function loadFavs() {
  const raw = readJson(FAV_KEY, []);
  return Array.isArray(raw) ? raw.filter((item) => typeof item === 'string') : [];
}

export const dashboard = $state({
  mode: null,
  authenticated: false,
  connecting: false,
  refreshing: false,
  expired: false,
  error: '',
  email: '',
  name: '',
  apps: [],
  google: [],
  info: [],
  updatedAt: 0,
  ready: false,
  query: '',
  favs: loadFavs(),
  campusOpen: false,
});

const initial = readStoredLinks();
if (initial) {
  dashboard.mode = 'link';
  dashboard.authenticated = true;
  dashboard.email = initial.email || '';
  dashboard.updatedAt = initial.at || 0;
} else {
  dashboard.mode = 'guest';
}

let started = false;
let refreshing = false;
let pollTimer = 0;
let pollSeq = 0;
let readyTimer = 0;
let readyStartedAt = 0;
let pagehideBound = false;
let forcedExpired = false;
let lastCatalog = readJson(CATALOG_KEY, null);
let lastState = readJson(STATE_KEY, null);

function normalizeMode(mode) {
  if (typeof mode !== 'string' || !mode) return 'local';
  return mode === 'guest' || mode === 'link' ? 'local' : mode;
}

function stateExpired(next) {
  if (!next || next.authenticated) return false;
  if (next.error) return false;
  return Boolean(
    next.email ||
      next.updatedAt ||
      (next.apps && next.apps.length) ||
      (next.google && next.google.length)
  );
}

function cacheState(next) {
  if (!next || next.connecting) return;
  lastState = next;
  writeJson(STATE_KEY, next);
}

async function requestJson(url, options = {}, timeout = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { cache: 'no-store', ...options, signal: controller.signal });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCatalog() {
  const { ok, data } = await requestJson('/catalog.json');
  if (ok && data && Array.isArray(data.apps)) {
    lastCatalog = data;
    writeJson(CATALOG_KEY, data);
    return data;
  }
  if (lastCatalog && Array.isArray(lastCatalog.apps)) return lastCatalog;
  return null;
}

async function fetchState() {
  const { ok, data } = await requestJson('/api/state');
  return ok && data && typeof data === 'object' ? data : null;
}

function applyCatalog(catalog, stored) {
  lastCatalog = catalog;
  dashboard.apps = appsFromCatalog(catalog, stored);
  dashboard.google = googleFromCatalog(catalog);
  dashboard.info = catalog?.info || [];
  dashboard.mode = stored ? 'link' : 'guest';
  dashboard.authenticated = Boolean(stored);
  dashboard.connecting = false;
  dashboard.error = '';
  dashboard.expired = false;
  dashboard.email = stored?.email || '';
  dashboard.updatedAt = stored?.at || 0;
  dashboard.ready = true;
}

function applyLocal(next, { expired = false } = {}) {
  const isExpired = Boolean(expired);
  dashboard.mode = normalizeMode(next.mode);
  dashboard.authenticated = Boolean(next.authenticated) && !isExpired;
  dashboard.connecting = Boolean(next.connecting);
  dashboard.error = next.error ? String(next.error) : '';
  dashboard.expired = isExpired;
  dashboard.email = dashboard.authenticated ? next.email || '' : '';
  dashboard.name = next.name || '';
  dashboard.apps = (next.apps || []).map((app) => ({
    ...app,
    link: app.url || `/go/${encodeURIComponent(app.id)}`,
  }));
  dashboard.google = (next.google || []).map((app) => ({
    ...app,
    link: app.url || `/go/${encodeURIComponent(app.id)}`,
  }));
  dashboard.info = next.info || [];
  dashboard.updatedAt = Number(next.updatedAt) || 0;
  dashboard.ready = true;
  syncPolling();
}

function consumeExpiredStatus() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('status') !== 'expired') return false;
  params.delete('status');
  const search = params.toString();
  window.history.replaceState(
    null,
    '',
    window.location.pathname + (search ? `?${search}` : '') + window.location.hash
  );
  return true;
}

function markExpired() {
  dashboard.expired = true;
  dashboard.authenticated = false;
  dashboard.email = '';
  dashboard.connecting = false;
  stopPolling();
  stopReadyCheck();
}

function finishLoad(state) {
  if (forcedExpired) {
    forcedExpired = false;
    if (dashboard.mode === 'guest') {
      showToast('Sesi habis — sambungkan ulang dulu.');
    } else if (!dashboard.error && (dashboard.mode === 'link' || !dashboard.authenticated)) {
      markExpired();
      showToast('Sesi habis — sambungkan ulang dulu.');
    }
  }

  if (dashboard.connecting) startPolling();
  else if (state && state.ready === false) scheduleReadyCheck();

  dashboard.ready = true;
}

function syncPolling() {
  if (dashboard.connecting) startPolling();
  else stopPolling();
}

function startPolling() {
  if (pollTimer) return;
  stopReadyCheck();
  const startedAt = Date.now();
  const seq = ++pollSeq;

  pollTimer = setInterval(async () => {
    if (seq !== pollSeq) return;
    if (!dashboard.connecting) {
      stopPolling();
      return;
    }

    if (Date.now() - startedAt > POLL_MAX_MS) {
      stopPolling();
      dashboard.connecting = false;
      dashboard.error = 'Waktu login habis. Coba lagi.';
      showToast('Waktu login habis. Coba lagi.');
      return;
    }

    const next = await fetchState();
    if (!next || seq !== pollSeq || !dashboard.connecting) return;

    cacheState(next);
    const wasConnecting = dashboard.connecting;
    applyLocal(next, { expired: stateExpired(next) });

    if (wasConnecting && !next.connecting) {
      stopPolling();
      if (next.authenticated) showToast('Terhubung. Sesi aktif.');
      else if (next.error) showToast(next.error);
    }
  }, POLL_MS);
}

function stopPolling() {
  pollSeq += 1;
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = 0;
}

function scheduleReadyCheck() {
  if (readyTimer || pollTimer) return;
  if (!readyStartedAt) readyStartedAt = Date.now();
  readyTimer = setTimeout(runReadyCheck, READY_POLL_MS);
}

async function runReadyCheck() {
  readyTimer = 0;
  if (!started || pollTimer) {
    readyStartedAt = 0;
    return;
  }

  const next = await fetchState();
  if (next) {
    cacheState(next);
    const keepGuest = dashboard.mode === 'guest' && !next.authenticated && !next.error;
    if (!keepGuest) applyLocal(next, { expired: stateExpired(next) });

    if (next.connecting) {
      readyStartedAt = 0;
      return;
    }
    if (next.error || next.ready !== false) {
      readyStartedAt = 0;
      return;
    }
  }

  if (Date.now() - readyStartedAt < READY_MAX_MS) {
    scheduleReadyCheck();
  } else {
    readyStartedAt = 0;
  }
}

function stopReadyCheck() {
  if (readyTimer) {
    clearTimeout(readyTimer);
    readyTimer = 0;
  }
  readyStartedAt = 0;
}

async function load() {
  forcedExpired = consumeExpiredStatus();
  const stored = refreshLinks();

  if (stored) {
    dashboard.mode = 'link';
    dashboard.authenticated = true;
    dashboard.email = stored.email || '';
    dashboard.updatedAt = stored.at || 0;

    const catalog = await fetchCatalog();
    if (catalog) {
      applyCatalog(catalog, stored);
      finishLoad(null);
      return;
    }

    const state = await fetchState();
    if (state) {
      cacheState(state);
      if (state.authenticated || state.connecting || state.error || stateExpired(state)) {
        applyLocal(state, { expired: stateExpired(state) });
        finishLoad(state);
        return;
      }
      if (state.ready === false) scheduleReadyCheck();
    }

    if (!state && lastState && lastState.authenticated) {
      applyLocal(lastState);
    }

    dashboard.ready = true;
    showToast('Gagal memuat katalog layanan.');
    finishLoad(state);
    return;
  }

  const [catalog, state] = await Promise.all([fetchCatalog(), fetchState()]);

  if (state) {
    cacheState(state);
    if (state.authenticated || state.connecting || state.error || stateExpired(state)) {
      applyLocal(state, { expired: stateExpired(state) });
      finishLoad(state);
      return;
    }

    if (catalog) {
      applyCatalog(catalog, null);
      finishLoad(state);
      return;
    }

    applyLocal(state);
    showToast('Katalog layanan tidak tersedia.');
    finishLoad(state);
    return;
  }

  if (lastState && (lastState.authenticated || lastState.connecting || stateExpired(lastState))) {
    applyLocal(lastState, { expired: stateExpired(lastState) });
    finishLoad(lastState);
    return;
  }

  if (catalog) {
    applyCatalog(catalog, null);
    finishLoad(null);
    return;
  }

  if (lastState) applyLocal(lastState, { expired: stateExpired(lastState) });

  dashboard.ready = true;
  showToast('Tidak bisa menghubungi server lokal.');
  finishLoad(lastState);
}

export async function initDashboard() {
  if (started) return;
  started = true;

  if (typeof window !== 'undefined' && !pagehideBound) {
    pagehideBound = true;
    window.addEventListener('pagehide', () => {
      stopPolling();
      stopReadyCheck();
    });
  }

  await load();
}

export function syncStoredLinks() {
  const stored = refreshLinks();
  if (dashboard.mode !== 'link' && dashboard.mode !== 'guest') return;

  if (!stored) {
    if (dashboard.mode !== 'link') return;
    dashboard.mode = 'guest';
    dashboard.authenticated = false;
    dashboard.email = '';
    dashboard.updatedAt = 0;
    if (lastCatalog) {
      dashboard.apps = appsFromCatalog(lastCatalog, null);
      dashboard.google = googleFromCatalog(lastCatalog);
    }
    return;
  }

  if (dashboard.mode === 'guest' && !lastCatalog) return;
  dashboard.mode = 'link';
  dashboard.authenticated = !dashboard.expired;
  dashboard.email = dashboard.expired ? '' : stored.email || '';
  dashboard.updatedAt = stored.at || 0;
  if (lastCatalog) dashboard.apps = appsFromCatalog(lastCatalog, stored);
}

export function toggleFavorite(app) {
  const favs = new Set(dashboard.favs);
  const wasFav = favs.has(app.id);

  if (wasFav) favs.delete(app.id);
  else favs.add(app.id);

  dashboard.favs = [...favs];
  writeJson(FAV_KEY, dashboard.favs);
  showToast(
    wasFav ? `${app.title} dihapus dari favorit.` : `${app.title} ditambahkan ke favorit.`
  );
}

export async function connectDashboard() {
  if (dashboard.mode === 'guest' || dashboard.mode === 'link') {
    location.href = '/connect.html';
    return;
  }
  if (dashboard.connecting) return;

  dashboard.connecting = true;
  dashboard.error = '';

  const { ok, data } = await requestJson('/api/connect', { method: 'POST' });
  if (ok && data && data.ok) {
    showToast('Menunggu login di jendela Chrome.');
    startPolling();
    return;
  }

  dashboard.connecting = false;
  location.href = '/connect.html';
}

export function cancelConnect() {
  if (!dashboard.connecting) return;
  stopPolling();
  dashboard.connecting = false;
  showToast('Login dibatalkan.');
}

export async function refreshDashboard() {
  if (dashboard.expired) {
    connectDashboard();
    return;
  }

  if (dashboard.mode === 'link' || dashboard.mode === 'guest') {
    location.href = '/connect.html';
    return;
  }

  if (refreshing) return;
  refreshing = true;
  dashboard.refreshing = true;

  try {
    const { data } = await requestJson('/api/refresh', { method: 'POST' }, REFRESH_TIMEOUT_MS);
    if (data?.state) {
      cacheState(data.state);
      applyLocal(data.state, { expired: stateExpired(data.state) });
      if (data.state.ready === false) scheduleReadyCheck();
    }
    if (data?.ok) showToast('Layanan diperbarui.');
    else if (data) showToast(data.error || 'Sesi perlu disambungkan ulang.');
    else showToast('Gagal memperbarui layanan.');
  } finally {
    refreshing = false;
    dashboard.refreshing = false;
  }
}

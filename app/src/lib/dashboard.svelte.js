import { readJson, writeJson } from './storage.js';
import { readStoredLinks, refreshLinks } from './links.svelte.js';
import { appsFromCatalog, googleFromCatalog } from './dashboard-data.js';
import { showToast } from './toast.svelte.js';

const FAV_KEY = 'sso.favs';

function loadFavs() {
  const raw = readJson(FAV_KEY, []);
  return Array.isArray(raw) ? raw.filter((item) => typeof item === 'string') : [];
}

export const dashboard = $state({
  mode: null,
  authenticated: false,
  connecting: false,
  refreshing: false,
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

async function fetchCatalog() {
  try {
    const res = await fetch('/catalog.json', { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchState() {
  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function applyCatalog(catalog, stored) {
  dashboard.apps = appsFromCatalog(catalog, stored);
  dashboard.google = googleFromCatalog(catalog);
  dashboard.info = catalog?.info || [];
  dashboard.mode = stored ? 'link' : 'guest';
  dashboard.authenticated = Boolean(stored);
  dashboard.email = stored?.email || '';
  dashboard.updatedAt = stored?.at || 0;
  dashboard.error = '';
  dashboard.ready = true;
}

function applyLocal(next) {
  dashboard.mode = 'local';
  dashboard.authenticated = Boolean(next.authenticated);
  dashboard.connecting = Boolean(next.connecting);
  dashboard.error = next.error ? String(next.error) : '';
  dashboard.email = next.email || '';
  dashboard.name = next.name || '';
  dashboard.apps = (next.apps || []).map((app) => ({ ...app, link: app.url || null }));
  dashboard.google = (next.google || []).map((app) => ({ ...app, link: app.url || null }));
  dashboard.info = next.info || [];
  dashboard.updatedAt = Number(next.updatedAt) || 0;
  dashboard.ready = true;
}

async function load() {
  const stored = refreshLinks();
  if (stored) {
    dashboard.mode = 'link';
    dashboard.authenticated = true;
    dashboard.email = stored.email || '';
    dashboard.updatedAt = stored.at || 0;
  }

  if (stored) {
    const catalog = await fetchCatalog();
    if (catalog) {
      applyCatalog(catalog, stored);
      return;
    }

    showToast('Gagal memuat katalog layanan.');
    const state = await fetchState();
    if (state?.authenticated) {
      applyLocal(state);
      return;
    }
    dashboard.ready = true;
    return;
  }

  const [catalog, state] = await Promise.all([fetchCatalog(), fetchState()]);

  if (state?.authenticated) {
    applyLocal(state);
    return;
  }

  if (catalog) {
    applyCatalog(catalog, null);
    return;
  }

  if (state) {
    applyLocal(state);
    showToast('Katalog layanan tidak tersedia.');
    return;
  }

  dashboard.ready = true;
  showToast('Tidak bisa menghubungi server lokal.');
}

export async function initDashboard() {
  if (started) return;
  started = true;
  await load();
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

export async function refreshDashboard() {
  if (dashboard.mode === 'link' || dashboard.mode === 'guest') {
    location.href = '/connect.html';
    return;
  }

  if (refreshing) return;
  refreshing = true;
  dashboard.refreshing = true;

  try {
    const res = await fetch('/api/refresh', { method: 'POST' });
    const data = await res.json();
    if (data.state) applyLocal(data.state);
    if (data.ok) showToast('Layanan diperbarui.');
    else showToast('Sesi perlu disambungkan ulang.');
  } catch {
    showToast('Gagal memperbarui layanan.');
  } finally {
    refreshing = false;
    dashboard.refreshing = false;
  }
}

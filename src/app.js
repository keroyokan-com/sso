import { animate } from 'motion';

const FAV_KEY = 'sso.favs';
const THEME_KEY = 'sso.theme';
const NAME_KEY = 'sso.name';
const LINK_KEY = 'sso.link';
const LINKS_KEY = 'sso.links';
const SECTION_KEY = 'sso.sections';
const SECTION_DEFS = [
  { id: 'folders', label: 'Kategori' },
  { id: 'favorites', label: 'Favorit' },
  { id: 'campus', label: 'Layanan kampus' },
  { id: 'google', label: 'Google' },
  { id: 'info', label: 'Info UNESA' },
];
const CHEVRON =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const APP_ICON_PATH = /^\/app-icons\/([^/]+)\.png$/;

const el = {
  search: document.getElementById('search'),
  clear: document.getElementById('clearBtn'),
  hint: document.getElementById('searchHint'),
  folders: document.getElementById('folderHost'),
  sections: document.getElementById('sectionHost'),
  favorites: document.getElementById('favoritesHost'),
  campus: document.getElementById('campusHost'),
  google: document.getElementById('googleHost'),
  grid: document.getElementById('sectionHost'),
  info: document.getElementById('infoHost'),
  banner: document.getElementById('bannerHost'),
  toast: document.getElementById('toast'),
  greeting: document.getElementById('greeting'),
  date: document.getElementById('dateLine'),
  email: document.getElementById('emailLabel'),
  footStatus: document.getElementById('footStatus'),
  footStatusText: document.getElementById('footStatusText'),
  sync: document.getElementById('syncText'),
  refresh: document.getElementById('refreshBtn'),
  refreshLabel: document.getElementById('refreshLabel'),
  theme: document.getElementById('themeBtn'),
  searchBtn: document.getElementById('searchBtn'),
  tpl: document.getElementById('cardTpl'),
};

let state = {
  mode: null,
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
  linksCount: 0,
};

const FOLDER_DEFS = [
  {
    id: 'kuliah',
    name: 'Kuliah & kelulusan',
    color: '#2563eb',
    hosts: [
      'sindig.unesa.ac.id',
      'edunesamall.unesa.ac.id',
      'pusbatep.unesa.ac.id',
      'melisa.unesa.ac.id',
      'neoyudisium.unesa.ac.id',
      'siani.unesa.ac.id',
      'bebaslab.unesa.ac.id',
    ],
  },
  {
    id: 'kegiatan',
    name: 'Kegiatan & karier',
    color: '#7452e8',
    hosts: [
      'sipena2.unesa.ac.id',
      'simpelmawa.unesa.ac.id',
      'simpkm.unesa.ac.id',
      'simpmw.unesa.ac.id',
      'pkkmb.unesa.ac.id',
      'pemira.unesa.ac.id',
      'lsp.unesa.ac.id',
      'tracerstudy.unesa.ac.id',
    ],
  },
  {
    id: 'riset',
    name: 'Riset & pustaka',
    color: '#0f8a79',
    hosts: [
      'simlppm.unesa.ac.id',
      'journal.unesa.ac.id',
      'iopac.unesa.ac.id',
      'digilib.unesa.ac.id',
      'apps-lib.unesa.ac.id',
      'vmsul.unesa.ac.id',
      'jdih.unesa.ac.id',
      'sijuna.unesa.ac.id',
      'siolos.unesa.ac.id',
    ],
  },
  {
    id: 'layanan',
    name: 'Layanan kampus',
    color: '#a86a12',
    hosts: [
      'ukt.unesa.ac.id',
      'e-layanan.unesa.ac.id',
      'umc.unesa.ac.id',
      'konseling.unesa.ac.id',
      'siyapa.unesa.ac.id',
      'internetaccess.unesa.ac.id',
      'unesa.me',
      'dashboard.unesa.ac.id',
      'e-audit.unesa.ac.id',
      'simarko.unesa.ac.id',
      'simpromas.unesa.ac.id',
    ],
  },
  {
    id: 'google',
    name: 'Google',
    color: '#3a404a',
    google: true,
  },
];

let openFolderState = null;

let favs = new Set();
let query = '';
let campusOpen = false;
let poll = null;
let readyTimer = null;
let toastTimer = null;
let refreshBusy = false;
let folderObserver = null;
let connectStartedAt = 0;

try {
  const raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  if (Array.isArray(raw)) favs = new Set(raw.filter((x) => typeof x === 'string'));
} catch {
  favs = new Set();
}

init();

function init() {
  initTheme();
  renderDate();
  renderSkeleton();
  bind();
  loadState();
  setInterval(renderSync, 30000);
}

/* ---------------- data ---------------- */

function readStoredLinks() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(LINKS_KEY) || 'null');
  } catch {
    raw = null;
  }

  if (!raw || typeof raw !== 'object' || !raw.links) {
    try {
      const old = JSON.parse(localStorage.getItem(LINK_KEY) || 'null');
      if (old && typeof old.email === 'string' && /^[A-Za-z0-9_-]{40,}$/.test(old.token || '')) {
        raw = {
          email: old.email,
          at: Number(old.at) || 0,
          links: {
            'sindig.unesa.ac.id': {
              url: `https://sindig.unesa.ac.id//${old.email}/${old.token}`,
              email: old.email,
              token: old.token,
              at: Number(old.at) || 0,
            },
          },
        };
      }
    } catch {
      /* ignore */
    }
  }

  if (!raw || typeof raw !== 'object' || !raw.links) return null;

  const links = {};
  let email = typeof raw.email === 'string' ? raw.email : null;
  let updatedAt = 0;

  for (const [host, entry] of Object.entries(raw.links)) {
    if (!entry || typeof entry.url !== 'string') continue;
    if (!/^[\w.-]+\.[\w.-]+$/.test(host)) continue;
    if (!/^https?:\/\//.test(entry.url)) continue;
    links[host] = {
      url: entry.url,
      email: entry.email || email,
      token: entry.token || '',
      at: Number(entry.at) || 0,
    };
    if (!email) email = entry.email || null;
    updatedAt = Math.max(updatedAt, Number(entry.at) || 0);
  }

  if (!Object.keys(links).length) return null;

  let newest = null;
  for (const entry of Object.values(links)) {
    if (!newest || entry.at > newest.at) newest = entry;
  }

  return { email, at: updatedAt, links, newest };
}

async function loadCatalog() {
  const res = await fetch('/catalog.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Katalog tidak tersedia');
  return res.json();
}

function buildServiceLink(app, stored) {
  if (app.url) return app.url;
  const token = stored.newest && stored.newest.token;
  if (token && app.origin && app.prefix) return `${app.origin}${app.prefix}${stored.email}/${token}`;
  if (app.origin) return app.origin + '/';
  return null;
}

async function applyGuestCatalog() {
  try {
    const catalog = await loadCatalog();
    const apps = (catalog.apps || []).map((app) => ({
      ...app,
      link: app.url || (app.origin ? app.origin + '/' : null),
    }));
    const google = (catalog.google || []).map((app) => ({
      ...app,
      link: app.url || null,
    }));

    apply({
      mode: 'guest',
      ready: true,
      authenticated: false,
      connecting: false,
      error: null,
      email: null,
      name: null,
      nim: null,
      apps,
      google,
      info: catalog.info || [],
      updatedAt: 0,
    });
    return true;
  } catch {
    return false;
  }
}

async function loadState() {
  const stored = readStoredLinks();
  if (stored) {
    try {
      const catalog = await loadCatalog();
      const apps = (catalog.apps || []).map((app) => ({
        ...app,
        link: buildServiceLink(app, stored),
      }));
      const google = (catalog.google || []).map((app) => ({
        ...app,
        link: app.url || null,
      }));

      apply({
        mode: 'link',
        ready: true,
        authenticated: true,
        connecting: false,
        error: null,
        email: stored.email,
        name: null,
        nim: null,
        apps,
        google,
        info: catalog.info || [],
        updatedAt: stored.at,
        linksCount: Object.keys(stored.links).length,
      });
      return;
    } catch {
      showToast('Gagal memuat katalog layanan.');
    }
  }

  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    const next = await res.json();

    if (next.authenticated) {
      apply(next);
    } else {
      const guest = await applyGuestCatalog();
      if (!guest) {
        apply(next);
        showToast('Katalog layanan tidak tersedia.');
      } else if (next.ready === false) {
        scheduleReadyCheck();
      }
    }
  } catch {
    if (!(await applyGuestCatalog())) {
      showToast('Tidak bisa menghubungi server lokal.');
      renderFooter();
    }
  }

  const params = new URLSearchParams(location.search);
  if (params.get('status') === 'expired') {
    showToast('Sesi habis — sambungkan ulang dulu.');
    history.replaceState(null, '', location.pathname);
  }
}

function apply(next) {
  state = {
    ...state,
    ...next,
    apps: next.apps || [],
    google: next.google || [],
    info: next.info || [],
  };
  renderAll();
  if (state.connecting) startPolling();
  if (!state.connecting && poll) stopPolling();
  if (next.ready === false) scheduleReadyCheck();
}

function scheduleReadyCheck() {
  if (readyTimer) return;
  readyTimer = setTimeout(async () => {
    readyTimer = null;
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      const next = await res.json();
      if (next.authenticated || state.mode !== 'guest') {
        apply(next);
      } else if (next.ready === false) {
        scheduleReadyCheck();
      }
    } catch {
      /* ignore */
    }
  }, 1500);
}

function renderAll() {
  if (openFolderState) resetFolderOverlay();
  renderGreeting();
  renderBanner();
  renderFolders();
  renderGrid();
  renderInfo();
  applySectionSettings();
  renderFooter();
}

/* ---------------- header / footer ---------------- */

function renderGreeting() {
  const name = getName() || state.name || '';
  el.greeting.textContent = 'Halo, ';

  const btn = document.createElement('span');
  btn.id = 'nameBtn';
  btn.className = 'name-btn' + (name ? '' : ' is-empty');
  btn.textContent = name || 'nama kamu';
  btn.title = name ? 'Ubah nama' : 'Atur nama tampilan';
  btn.tabIndex = 0;
  btn.setAttribute('role', 'button');
  btn.setAttribute('aria-label', name ? 'Ubah nama tampilan' : 'Atur nama tampilan');

  el.greeting.append(btn, document.createTextNode('.'));

  if (state.email) {
    el.email.textContent = state.email;
    el.email.hidden = false;
  } else {
    el.email.hidden = true;
  }
}

function getName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

function setName(value) {
  try {
    if (value) localStorage.setItem(NAME_KEY, value);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    /* ignore */
  }
}

function editName() {
  const input = document.createElement('input');
  input.className = 'name-input';
  input.value = getName() || state.name || '';
  input.placeholder = 'nama kamu';
  input.maxLength = 40;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Nama tampilan');

  el.greeting.textContent = 'Halo, ';
  el.greeting.append(input, document.createTextNode('.'));
  input.focus();
  input.select();

  let done = false;
  const finish = (save) => {
    if (done) return;
    done = true;
    if (save) setName(input.value.trim().replace(/\s+/g, ' '));
    renderGreeting();
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finish(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener('blur', () => finish(true));
}

function renderFooter() {
  const dot = el.footStatus.querySelector('.dot');
  let text = 'Memuat…';
  let cls = 'amber';
  if (state.connecting) {
    text = 'Menghubungkan…';
  } else if (state.mode === 'link') {
    text = 'Link aktif';
    cls = '';
  } else if (state.mode === 'guest') {
    text = 'Mode tamu';
    cls = '';
  } else if (state.authenticated) {
    text = 'Sesi aktif';
    cls = '';
  } else {
    text = 'Sesi belum tersambung';
  }
  el.footStatusText.textContent = text;
  dot.className = 'dot' + (cls ? ' ' + cls : '');
  if (el.refreshLabel) {
    el.refreshLabel.textContent =
      state.mode === 'link'
        ? 'Ganti link'
        : state.mode === 'guest'
          ? 'Hubungkan'
          : 'Refresh';
  }
  renderSync();
}

function renderSync() {
  if (state.mode === 'link' && state.updatedAt) {
    el.sync.textContent = 'Link · ' + relativeTime(state.updatedAt);
  } else if (state.mode === 'guest') {
    el.sync.textContent = 'Katalog lokal';
  } else if (state.updatedAt) {
    el.sync.textContent = 'Tersinkron ' + relativeTime(state.updatedAt);
  } else {
    el.sync.textContent = 'Belum tersinkron';
  }
}

function relativeTime(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} mnt lalu`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function renderDate() {
  const text = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  el.date.textContent = text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------------- banner ---------------- */

function renderBanner() {
  if (state.connecting) {
    el.banner.innerHTML = `
      <div class="banner">
        <span class="spinner" aria-hidden="true"></span>
        <span class="grow"><strong>Menunggu login di jendela Chrome.</strong> Selesaikan login Google, halaman ini lanjut sendiri.</span>
      </div>`;
    return;
  }

  if (state.mode === 'guest') {
    el.banner.innerHTML = `
      <div class="banner">
        <span class="dot" aria-hidden="true"></span>
        <span class="grow"><strong>Mode tamu.</strong> Tautkan akun untuk membuka layanan dengan sekali klik.</span>
        <a class="btn" href="/connect.html">Hubungkan</a>
      </div>`;
    return;
  }

  if (state.error) {
    el.banner.innerHTML = `
      <div class="banner">
        <span class="dot red" aria-hidden="true"></span>
        <span class="grow"><strong>Login gagal.</strong> ${escapeHtml(state.error)}</span>
        <a class="btn" href="/connect.html">Coba lagi</a>
      </div>`;
    return;
  }

  if (!state.authenticated && state.apps.length + state.google.length > 0) {
    el.banner.innerHTML = `
      <div class="banner">
        <span class="dot amber" aria-hidden="true"></span>
        <span class="grow"><strong>Sesi habis.</strong> Sambungkan ulang untuk membuka layanan.</span>
        <a class="btn" href="/connect.html">Sambungkan</a>
      </div>`;
    return;
  }

  el.banner.innerHTML = '';
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------------- grid ---------------- */

function renderSkeleton() {
  const cell = `
    <div class="tile skeleton">
      <div class="app">
        <span class="app-icon"></span>
        <span class="app-meta"><span class="app-title"></span><span class="app-desc"></span></span>
      </div>
    </div>`;
  el.campus.innerHTML = `<section class="section"><div class="tiles">${cell.repeat(8)}</div></section>`;
  el.favorites.replaceChildren();
  el.google.replaceChildren();
}

function renderEmpty() {
  el.campus.innerHTML = `
    <div class="empty">
      <div class="empty-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <h2>Hubungkan akun UNESA</h2>
      <p>Login sekali lewat Google. Setelah itu sesi dijaga otomatis di latar belakang.</p>
      <a class="btn primary" href="/connect.html">Hubungkan akun</a>
      <p class="fine">Butuh cookie dari sesi UNESA-mu. Panduan lengkap ada di halaman berikutnya.</p>
    </div>`;
  el.favorites.replaceChildren();
  el.google.replaceChildren();
}

function readSectionSettings() {
  const defaults = SECTION_DEFS.map((section) => section.id);
  try {
    const raw = JSON.parse(localStorage.getItem(SECTION_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return { order: defaults, hidden: [] };
    const order = Array.isArray(raw.order) ? raw.order.filter((id) => defaults.includes(id)) : [];
    for (const id of defaults) {
      if (order.includes(id)) continue;
      const index = defaults.indexOf(id);
      order.splice(Math.min(index, order.length), 0, id);
    }
    const hidden = Array.isArray(raw.hidden) ? raw.hidden.filter((id) => defaults.includes(id)) : [];
    return { order, hidden };
  } catch {
    return { order: defaults, hidden: [] };
  }
}

function applySectionSettings() {
  const settings = readSectionSettings();
  const hosts = {
    folders: el.folders,
    favorites: el.favorites,
    campus: el.campus,
    google: el.google,
    info: el.info,
  };

  settings.order.forEach((id, index) => {
    const host = hosts[id];
    if (host) host.style.order = String(index);
  });

  for (const [id, host] of Object.entries(hosts)) {
    if (!host) continue;
    const hidden = settings.hidden.includes(id);
    host.hidden = hidden;
    host.style.display = hidden ? 'none' : '';
  }
}

function renderGrid() {
  const q = query.trim().toLowerCase();
  const campus = state.apps || [];
  const google = state.google || [];
  const total = campus.length + google.length;

  if (!total) {
    if (!state.connecting && state.ready !== false) renderEmpty();
    return;
  }

  const match = (a) => !q || `${a.title} ${a.desc || ''} ${a.host}`.toLowerCase().includes(q);
  const byTitle = (a, b) => a.title.localeCompare(b.title, 'id', { sensitivity: 'base' });

  const visibleCampus = campus.filter(match).sort(byTitle);
  const visibleGoogle = google.filter(match);
  const favCampus = visibleCampus.filter((a) => favs.has(a.id)).sort(byTitle);
  const favGoogle = visibleGoogle.filter((a) => favs.has(a.id));
  const favsAll = [...favCampus, ...favGoogle];

  const favoritesFrag = document.createDocumentFragment();
  const campusFrag = document.createDocumentFragment();
  const googleFrag = document.createDocumentFragment();

  if (q) {
    if (!favsAll.length && !visibleCampus.length && !visibleGoogle.length) {
      const none = document.createElement('div');
      none.className = 'no-results';
      none.innerHTML = `Tidak ada layanan yang cocok dengan <strong></strong>.`;
      none.querySelector('strong').textContent = query.trim();
      campusFrag.appendChild(none);
    } else {
      if (visibleCampus.length) campusFrag.appendChild(buildSection('Layanan kampus', visibleCampus));
      if (visibleGoogle.length) googleFrag.appendChild(buildSection('Google', visibleGoogle));
    }
  } else {
    if (favsAll.length) favoritesFrag.appendChild(buildSection('Favorit', favsAll));
    const restCampus = visibleCampus.filter((a) => !favs.has(a.id));
    const restGoogle = visibleGoogle.filter((a) => !favs.has(a.id));
    if (restCampus.length) {
      campusFrag.appendChild(
        buildSection('Layanan kampus', restCampus, {
          accordion: true,
          expanded: campusOpen,
          onToggle: toggleCampus,
        })
      );
    }
    if (restGoogle.length) googleFrag.appendChild(buildSection('Google', restGoogle));
  }

  el.favorites.replaceChildren(favoritesFrag);
  el.campus.replaceChildren(campusFrag);
  el.google.replaceChildren(googleFrag);

}

function buildSection(title, list, opts = {}) {
  const section = document.createElement('section');
  section.className = 'section';

  const head = document.createElement('div');
  head.className = 'section-head';
  const h2 = document.createElement('h2');
  h2.textContent = title;

  const accordion = Boolean(opts.accordion) && list.length > 4;
  const expanded = Boolean(opts.expanded);
  const shown = accordion && !expanded ? list.slice(0, 4) : list;

  if (accordion) {
    const actions = document.createElement('div');
    actions.className = 'section-actions';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'section-toggle campus-toggle';
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-controls', 'campus-tiles');
    const label = expanded ? 'Tampilkan lebih sedikit' : `Lihat semua ${list.length} layanan`;
    toggle.innerHTML = `${label}${CHEVRON}`;
    toggle.addEventListener('click', opts.onToggle);

    actions.append(toggle);
    head.append(h2, actions);
  } else {
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = String(list.length);
    head.append(h2, count);
  }

  const tiles = document.createElement('div');
  tiles.className = 'tiles';
  if (accordion) tiles.id = 'campus-tiles';
  shown.forEach((app) => tiles.appendChild(makeCard(app)));

  section.append(head, tiles);
  return section;
}

function toggleCampus() {
  campusOpen = !campusOpen;
  const y = window.scrollY;
  renderGrid();
  requestAnimationFrame(() => {
    const btn = el.grid.querySelector('.campus-toggle');
    if (btn) btn.focus({ preventScroll: true });
    window.scrollTo(0, y);
  });
}

function renderInfo() {
  if (query.trim() || !state.info.length) {
    el.info.replaceChildren();
    return;
  }

  const section = document.createElement('section');
  section.className = 'section info-section';

  const head = document.createElement('div');
  head.className = 'section-head';
  const h2 = document.createElement('h2');
  h2.textContent = 'Info UNESA';
  head.append(h2);

  const list = document.createElement('div');
  list.className = 'info-list';

  for (const item of state.info) {
    const link = document.createElement('a');
    link.className = 'info-item';
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.innerHTML = '<span class="info-title"></span><svg class="info-arrow"><use href="#i-arrow"/></svg>';
    link.querySelector('.info-title').textContent = item.title;
    list.appendChild(link);
  }

  section.append(head, list);
  el.info.replaceChildren(section);
}

/* ---------------- category folders ---------------- */

function buildFolders() {
  const campus = state.apps || [];
  const google = state.google || [];
  const byHost = new Map(campus.map((app) => [app.host, app]));
  const assigned = new Set();

  const folders = FOLDER_DEFS.map((def) => {
    const apps = def.google
      ? google.slice()
      : def.hosts.map((host) => byHost.get(host)).filter(Boolean);
    apps.forEach((app) => assigned.add(app.id));
    return { ...def, apps };
  });

  const rest = campus.filter((app) => !assigned.has(app.id));
  if (rest.length) {
    const layanan = folders.find((folder) => folder.id === 'layanan');
    if (layanan) layanan.apps.push(...rest);
  }

  return folders.filter((folder) => folder.apps.length);
}

function renderFolders() {
  if (folderObserver) {
    folderObserver.disconnect();
    folderObserver = null;
  }

  if (query.trim() || (!state.apps.length && !state.google.length)) {
    el.folders.replaceChildren();
    return;
  }

  const folders = buildFolders();
  if (!folders.length) {
    el.folders.replaceChildren();
    return;
  }

  const section = document.createElement('section');
  section.className = 'section folder-section';

  const head = document.createElement('div');
  head.className = 'section-head';
  const h2 = document.createElement('h2');
  h2.textContent = 'Kategori';
  const count = document.createElement('span');
  count.className = 'count';
  count.textContent = `${folders.length} folder`;
  head.append(h2, count);

  const row = document.createElement('div');
  row.className = 'folder-row';
  folders.forEach((folder) => row.appendChild(makeFolderCard(folder)));

  const scroll = document.createElement('div');
  scroll.className = 'folder-scroll';
  scroll.appendChild(row);

  const update = () => {
    const scrollable = row.scrollWidth > row.clientWidth + 1;
    scroll.classList.toggle('scrollable', scrollable);
    scroll.classList.toggle('at-start', row.scrollLeft <= 1);
    scroll.classList.toggle('at-end', row.scrollLeft + row.clientWidth >= row.scrollWidth - 1);
  };
  row.addEventListener('scroll', update, { passive: true });
  if ('ResizeObserver' in window) {
    folderObserver = new ResizeObserver(update);
    folderObserver.observe(row);
  } else {
    window.addEventListener('resize', update);
  }
  requestAnimationFrame(update);

  section.append(head, scroll);
  el.folders.replaceChildren(section);
}

function makeFolderCard(folder) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'folder-card';
  card.dataset.folder = folder.id;
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('aria-label', `Buka folder ${folder.name}, ${folder.apps.length} layanan`);

  const preview = document.createElement('div');
  preview.className = 'folder-preview';

  const largeCount = folder.apps.length >= 7 ? 3 : Math.min(4, folder.apps.length);
  const miniApps =
    folder.apps.length >= 7
      ? folder.apps.slice(3, 7)
      : folder.apps.length >= 5
        ? folder.apps.slice(3)
        : [];

  for (let i = 0; i < largeCount; i++) {
    preview.appendChild(folderTile(folder.apps[i], 'large'));
  }

  if (miniApps.length) {
    const mini = document.createElement('div');
    mini.className = 'folder-mini';
    for (let i = 0; i < 4; i++) {
      const app = miniApps[i];
      if (app) {
        mini.appendChild(folderTile(app, 'mini'));
      } else {
        const empty = document.createElement('span');
        empty.className = 'folder-mini-cell folder-mini-empty';
        mini.appendChild(empty);
      }
    }
    preview.appendChild(mini);
  } else {
    for (let i = largeCount; i < 4; i++) {
      const empty = document.createElement('span');
      empty.className = 'folder-cell folder-cell-empty';
      preview.appendChild(empty);
    }
  }

  const label = document.createElement('div');
  label.className = 'folder-card-label';
  const name = document.createElement('span');
  name.className = 'folder-card-name';
  name.textContent = folder.name;
  label.append(name);

  card.append(preview, label);
  return card;
}

function folderTile(app, kind) {
  const cell = document.createElement('span');
  cell.className = kind === 'large' ? 'folder-cell' : 'folder-mini-cell';
  if (kind === 'mini') cell.dataset.appId = app.id;

  if (app.icon) {
    const large = kind === 'large';
    const size = large ? 46 : 21;
    cell.appendChild(
      iconImage(app, {
        className: large ? 'folder-tile' : 'folder-mini-tile',
        width: size,
        height: size,
        sizes: `${size}px`,
        loading: 'eager',
        fetchPriority: large ? 'high' : null,
        onError: () => cell.replaceChildren(folderLetter(app.title, kind)),
      })
    );
  } else {
    cell.appendChild(folderLetter(app.title, kind));
  }

  return cell;
}

function folderLetter(title, kind) {
  const letter = document.createElement('span');
  letter.className = kind === 'large' ? 'folder-letter' : 'folder-letter folder-letter-mini';
  letter.textContent = (title.match(/[a-z0-9]/i) || ['?'])[0].toUpperCase();
  return letter;
}

function appIconSources(src) {
  const match = APP_ICON_PATH.exec(src || '');
  if (!match) return null;
  const name = match[1];
  return {
    avif: `/app-icons/48/${name}.avif 48w, /app-icons/96/${name}.avif 96w`,
    webp: `/app-icons/48/${name}.webp 48w, /app-icons/96/${name}.webp 96w`,
    png: src,
  };
}

function iconImage(app, options) {
  const sources = appIconSources(app.icon);
  const img = document.createElement('img');
  img.src = sources ? sources.png : app.icon;
  img.alt = '';
  img.width = options.width;
  img.height = options.height;
  img.sizes = options.sizes;
  img.loading = options.loading;
  img.decoding = 'async';
  if (options.className) img.className = options.className;
  if (options.fetchPriority) img.setAttribute('fetchpriority', options.fetchPriority);
  if (options.onError) img.addEventListener('error', options.onError, { once: true });

  if (!sources) return img;

  const picture = document.createElement('picture');
  picture.style.display = 'contents';

  for (const [type, srcset] of [
    ['image/avif', sources.avif],
    ['image/webp', sources.webp],
  ]) {
    const source = document.createElement('source');
    source.type = type;
    source.srcset = srcset;
    source.sizes = options.sizes;
    picture.appendChild(source);
  }

  picture.appendChild(img);
  return picture;
}

function resetFolderOverlay() {
  const s = openFolderState;
  if (!s) return;
  openFolderState = null;
  if (s.anims) s.anims.forEach((anim) => { try { anim.cancel(); } catch { /* ignore */ } });
  if (s.clones) s.clones.forEach((clone) => clone.remove());
  if (s.overlay && s.overlay.parentNode) s.overlay.remove();
  document.body.classList.remove('folder-overlay-open');
}

function openFolder(folderId, trigger) {
  if (openFolderState) return;
  const folder = buildFolders().find((entry) => entry.id === folderId);
  if (!folder || !folder.apps.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'folder-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'folderOverlayTitle');
  overlay.innerHTML = `
    <div class="folder-overlay-inner">
      <button class="folder-close" type="button" aria-label="Tutup folder">
        <svg><use href="#i-x"/></svg>
      </button>
      <div class="folder-overlay-head">
        <h2 id="folderOverlayTitle"></h2>
        <p class="folder-overlay-count"></p>
      </div>
      <div class="folder-open-grid"></div>
    </div>`;

  overlay.querySelector('#folderOverlayTitle').textContent = folder.name;
  overlay.querySelector('.folder-overlay-count').textContent = `${folder.apps.length} layanan`;

  const grid = overlay.querySelector('.folder-open-grid');
  for (const app of folder.apps) {
    const link = document.createElement('a');
    link.className = 'folder-app';
    link.href = app.link || app.url || '/go/' + encodeURIComponent(app.id);
    link.target = '_blank';
    link.rel = 'noopener';
    link.dataset.appId = app.id;
    link.innerHTML = '<span class="folder-app-icon"></span><span class="folder-app-name"></span>';
    link.querySelector('.folder-app-name').textContent = app.title;

    const icon = link.querySelector('.folder-app-icon');
    if (app.icon) {
      icon.appendChild(
        iconImage(app, {
          width: 56,
          height: 56,
          sizes: '56px',
          loading: 'eager',
          onError: () => icon.replaceChildren(folderLetter(app.title, 'large')),
        })
      );
    } else {
      icon.appendChild(folderLetter(app.title, 'large'));
    }

    grid.appendChild(link);
  }

  document.body.appendChild(overlay);
  document.body.classList.add('folder-overlay-open');

  const closeBtn = overlay.querySelector('.folder-close');
  const preview = trigger.querySelector('.folder-preview');
  const rect = preview.getBoundingClientRect();
  const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

  const sources = new Map();
  trigger.querySelectorAll('.folder-mini [data-app-id]').forEach((el) => {
    const img = el.querySelector('img');
    if (!img) return;
    sources.set(el.dataset.appId, {
      rect: img.getBoundingClientRect(),
      src: img.currentSrc || img.src,
    });
  });

  const targets = new Map();
  overlay.querySelectorAll('.folder-app').forEach((el) => {
    const icon = el.querySelector('.folder-app-icon');
    targets.set(el.dataset.appId, icon.getBoundingClientRect());
  });

  const s = {
    overlay,
    folder,
    trigger,
    closeBtn,
    sources,
    targets,
    origin,
    anims: [],
    clones: [],
    closing: false,
    reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
  openFolderState = s;

  if (!s.reduce) {
    overlay.querySelector('.folder-overlay-head').style.opacity = '0';
    closeBtn.style.opacity = '0';
    overlay.querySelectorAll('.folder-app-icon').forEach((icon) => {
      icon.style.opacity = '0';
    });
    overlay.querySelectorAll('.folder-app-name').forEach((label) => {
      label.style.opacity = '0';
    });
  }

  const close = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    closeFolder();
  };

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target.closest('.folder-close')) return;
    if (!event.target.closest('.folder-overlay-inner')) close();
  });
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      close(event);
      return;
    }
    if (event.key !== 'Tab') return;

    const focusables = [closeBtn, ...overlay.querySelectorAll('.folder-app')];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  closeBtn.focus({ preventScroll: true });

  if (s.reduce) {
    return;
  }

  requestAnimationFrame(() => animateFolderOpen(s));
}

function animateFolderOpen(s) {
  const { sources, targets, origin } = s;
  const overlay = s.overlay;
  const head = overlay.querySelector('.folder-overlay-head');
  const closeBtn = overlay.querySelector('.folder-close');

  animate(head, { opacity: [0, 1], y: [12, 0] }, {
    duration: 0.28,
    ease: [0.22, 1, 0.36, 1],
  });

  animate(closeBtn, { opacity: [0, 1] }, { duration: 0.16, delay: 0.02, ease: 'easeOut' });

  const tiles = [...overlay.querySelectorAll('.folder-app')];

  const revealLabel = (label, delay = 0) => {
    const anim = animate(
      label,
      { opacity: [0, 1], y: [4, 0] },
      { duration: 0.22, delay, ease: [0.22, 1, 0.36, 1] }
    );
    s.anims.push(anim);
  };

  tiles.forEach((tile, index) => {
    const appId = tile.dataset.appId;
    const source = sources.get(appId);
    const target = targets.get(appId);
    const icon = tile.querySelector('.folder-app-icon');
    const label = tile.querySelector('.folder-app-name');
    const img = icon.querySelector('img');
    const labelDelay = 0.04 + index * 0.006;

    if (source && target && img) {
      icon.style.opacity = '0';

      const clone = document.createElement('img');
      clone.className = 'folder-fly';
      clone.src = source.src;
      clone.alt = '';
      clone.style.left = source.rect.left + 'px';
      clone.style.top = source.rect.top + 'px';
      clone.style.width = source.rect.width + 'px';
      clone.style.height = source.rect.height + 'px';
      document.body.appendChild(clone);
      s.clones.push(clone);

      const dx = target.left - source.rect.left;
      const dy = target.top - source.rect.top;
      const scale = target.width / Math.max(1, source.rect.width);

      const anim = animate(
        clone,
        { x: dx, y: dy, scale },
        { type: 'spring', stiffness: 320, damping: 30, mass: 0.7 }
      );
      s.anims.push(anim);

      anim.then(() => {
        icon.style.opacity = '';
        clone.remove();
        const at = s.clones.indexOf(clone);
        if (at >= 0) s.clones.splice(at, 1);
      });
      revealLabel(label, labelDelay);
      return;
    }

    if (target) {
      icon.style.opacity = '0';
      const dx = origin.x - (target.left + target.width / 2);
      const dy = origin.y - (target.top + target.height / 2);
      const delay = index * 0.006;

      const anim = animate(
        icon,
        { opacity: [0, 1], x: [dx, 0], y: [dy, 0], scale: [0.2, 1] },
        { duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }
      );
      s.anims.push(anim);
      revealLabel(label, 0.05 + index * 0.006);
      return;
    }

    animate(icon, { opacity: [0, 1] }, { duration: 0.18, delay: 0.02, ease: 'easeOut' });
    revealLabel(label, 0.08);
  });
}

function closeFolder() {
  const s = openFolderState;
  if (!s || s.closing) return;
  s.closing = true;

  if (s.reduce) {
    finishFolderClose(s);
    return;
  }

  if (s.anims) {
    s.anims.forEach((anim) => { try { anim.cancel(); } catch { /* ignore */ } });
    s.anims = [];
  }
  if (s.clones) {
    s.clones.forEach((clone) => clone.remove());
    s.clones = [];
  }

  const { overlay, trigger } = s;
  const tiles = [...overlay.querySelectorAll('.folder-app')];
  tiles.forEach((tile) => {
    const label = tile.querySelector('.folder-app-name');
    if (label) {
      s.anims.push(animate(label, { opacity: 0 }, { duration: 0.1, ease: 'easeOut' }));
    }
  });

  const preview = trigger.querySelector('.folder-preview');
  const originRect = preview.getBoundingClientRect();
  const origin = { x: originRect.left + originRect.width / 2, y: originRect.top + originRect.height / 2 };

  const sources = new Map();
  trigger.querySelectorAll('.folder-mini [data-app-id]').forEach((el) => {
    const img = el.querySelector('img');
    if (!img) return;
    sources.set(el.dataset.appId, {
      rect: img.getBoundingClientRect(),
      src: img.currentSrc || img.src,
    });
  });

  tiles.forEach((tile, index) => {
    const appId = tile.dataset.appId;
    const source = sources.get(appId);
    const icon = tile.querySelector('.folder-app-icon');
    const img = icon.querySelector('img');
    const target = icon.getBoundingClientRect();

    if (source && img) {
      icon.style.opacity = '0';
      const clone = document.createElement('img');
      clone.className = 'folder-fly';
      clone.src = source.src;
      clone.alt = '';
      clone.style.left = target.left + 'px';
      clone.style.top = target.top + 'px';
      clone.style.width = target.width + 'px';
      clone.style.height = target.height + 'px';
      document.body.appendChild(clone);
      s.clones.push(clone);

      const dx = source.rect.left - target.left;
      const dy = source.rect.top - target.top;
      const scale = source.rect.width / Math.max(1, target.width);

      const anim = animate(
        clone,
        { x: dx, y: dy, scale },
        { type: 'spring', stiffness: 320, damping: 30, mass: 0.7 }
      );
      s.anims.push(anim);
      anim.then(() => clone.remove());
      return;
    }

    const dx = origin.x - (target.left + target.width / 2);
    const dy = origin.y - (target.top + target.height / 2);
    const anim = animate(
      icon,
      { opacity: [1, 0], x: [0, dx], y: [0, dy], scale: [1, 0.2] },
      {
        duration: 0.24,
        delay: (tiles.length - index) * 0.006,
        ease: [0.4, 0, 0.6, 1],
      }
    );
    s.anims.push(anim);
  });

  s.anims.push(
    animate(
      overlay.querySelector('.folder-overlay-inner'),
      { opacity: [1, 0] },
      { duration: 0.16, delay: 0.08, ease: 'easeIn' }
    )
  );

  setTimeout(() => finishFolderClose(s), 340);
}

function finishFolderClose(s) {
  const overlay = s.overlay;
  const trigger = s.trigger;
  const wasOpen = openFolderState === s;
  if (wasOpen) openFolderState = null;

  if (s.anims) s.anims.forEach((anim) => { try { anim.cancel(); } catch { /* ignore */ } });
  if (s.clones) s.clones.forEach((clone) => clone.remove());
  if (overlay && overlay.parentNode) overlay.remove();
  document.body.classList.remove('folder-overlay-open');

  if (wasOpen && trigger && trigger.isConnected) {
    trigger.focus({ preventScroll: true });
  }
}

function makeCard(app) {
  const node = el.tpl.content.firstElementChild.cloneNode(true);
  const link = node.querySelector('.app');
  link.href = app.link || app.url || '/go/' + encodeURIComponent(app.id);
  link.dataset.id = app.id;
  link.setAttribute('aria-label', `${app.title}${app.desc ? ' — ' + app.desc : ''} — buka di tab baru`);
  node.querySelector('.app-title').textContent = app.title;
  const desc = node.querySelector('.app-desc');
  desc.textContent = app.desc || '';
  if (!app.desc) desc.remove();

  const iconBox = node.querySelector('.app-icon');
  if (app.icon) {
    iconBox.appendChild(
      iconImage(app, {
        width: 38,
        height: 38,
        sizes: '38px',
        loading: 'lazy',
        onError: () => setLetter(iconBox, app.title),
      })
    );
  } else {
    setLetter(iconBox, app.title);
  }

  const star = node.querySelector('.star');
  star.dataset.id = app.id;
  star.dataset.title = app.title;
  const active = favs.has(app.id);
  star.setAttribute('aria-pressed', String(active));
  star.setAttribute('aria-label', active ? `Hapus ${app.title} dari favorit` : `Favoritkan ${app.title}`);
  return node;
}

function setLetter(box, title) {
  box.textContent = '';
  const letter = document.createElement('span');
  letter.className = 'letter';
  letter.textContent = (title.match(/[a-z0-9]/i) || ['?'])[0].toUpperCase();
  box.appendChild(letter);
}

/* ---------------- actions ---------------- */

function bind() {
  el.search.addEventListener('input', () => {
    query = el.search.value;
    el.clear.hidden = !query;
    el.hint.hidden = !!query;
    renderFolders();
    renderGrid();
    renderInfo();
  });

  el.clear.addEventListener('click', () => {
    el.search.value = '';
    query = '';
    el.clear.hidden = true;
    el.hint.hidden = false;
    renderFolders();
    renderGrid();
    renderInfo();
    el.search.focus();
  });

  el.theme.addEventListener('click', () => {
    const current =
      document.documentElement.dataset.theme ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(current === 'dark' ? 'light' : 'dark', true);
  });

  el.searchBtn?.addEventListener('click', () => {
    el.search.focus();
    el.search.select();
  });

  const top = document.querySelector('.top');
  if (top) {
    const onScroll = () => top.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  el.refresh.addEventListener('click', refresh);

  document.addEventListener('keydown', (event) => {
    const active = document.activeElement;
    const typing =
      /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || active.isContentEditable;

    if (
      (event.key === '/' && !typing) ||
      ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')
    ) {
      event.preventDefault();
      el.search.focus();
      el.search.select();
      return;
    }

    if (event.key === 'Escape' && active === el.search) {
      el.search.value = '';
      query = '';
      el.clear.hidden = true;
      el.hint.hidden = false;
      renderFolders();
      renderGrid();
      renderInfo();
      el.search.blur();
    }

    const nameBtn = event.target.closest('#nameBtn');
    if (nameBtn && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      editName();
    }
  });

  el.search.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      const first = el.grid.querySelector('a.app');
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  el.grid.addEventListener('keydown', (event) => {
    const link = event.target.closest('a.app');
    if (!link) return;
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      navigate(link, event.key);
    }
  });

  el.grid.addEventListener('click', (event) => {
    const star = event.target.closest('.star');
    if (star) {
      event.preventDefault();
      event.stopPropagation();
      toggleFav(star.dataset.id, star.dataset.title);
      return;
    }

    const link = event.target.closest('a.app');
    if (!link) return;
    if (!state.authenticated && state.mode !== 'guest') {
      event.preventDefault();
      renderBanner();
      el.banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      showToast('Sambungkan akun dulu.');
    }
  });

  el.folders.addEventListener('click', (event) => {
    const card = event.target.closest('.folder-card');
    if (!card) return;
    openFolder(card.dataset.folder, card);
  });

  document.addEventListener('click', (event) => {
    const nameBtn = event.target.closest('#nameBtn');
    if (nameBtn) editName();
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!localStorage.getItem(THEME_KEY)) {
      applyTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', false);
    }
  });
}

function navigate(current, direction) {
  const items = [...el.grid.querySelectorAll('a.app')];
  const from = current.getBoundingClientRect();
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;

  let best = null;
  let bestScore = Infinity;

  for (const item of items) {
    if (item === current) continue;
    const rect = item.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - cx;
    const dy = rect.top + rect.height / 2 - cy;

    const valid =
      direction === 'ArrowRight'
        ? dx > 8
        : direction === 'ArrowLeft'
          ? dx < -8
          : direction === 'ArrowDown'
            ? dy > 8
            : dy < -8;
    if (!valid) continue;

    const horizontal = direction === 'ArrowRight' || direction === 'ArrowLeft';
    const score = (horizontal ? Math.abs(dx) : Math.abs(dy)) +
      (horizontal ? Math.abs(dy) : Math.abs(dx)) * 3;
    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (best) {
    best.focus();
    best.scrollIntoView({ block: 'nearest' });
  }
}

function toggleFav(id, title) {
  const wasFav = favs.has(id);
  if (wasFav) favs.delete(id);
  else favs.add(id);
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
  } catch {
    /* ignore */
  }

  const y = window.scrollY;
  renderGrid();
  window.scrollTo(0, y);

  const next = el.grid.querySelector(`.star[data-id="${CSS.escape(id)}"]`);
  if (next) next.focus({ preventScroll: true });

  showToast(wasFav ? `${title} dihapus dari favorit.` : `${title} ditambahkan ke favorit.`);
}

async function refresh() {
  if (state.mode === 'link' || state.mode === 'guest') {
    location.href = '/connect.html';
    return;
  }
  if (refreshBusy) return;
  refreshBusy = true;
  el.refresh.disabled = true;
  el.refresh.classList.add('spinning');

  try {
    const res = await fetch('/api/refresh', { method: 'POST' });
    const data = await res.json();
    if (data.state) apply(data.state);
    if (data.ok) showToast('Layanan diperbarui.');
    else showToast('Sesi perlu disambungkan ulang.');
  } catch {
    showToast('Gagal memperbarui layanan.');
  } finally {
    refreshBusy = false;
    el.refresh.disabled = false;
    el.refresh.classList.remove('spinning');
  }
}

/* ---------------- polling ---------------- */

function startPolling() {
  if (poll) return;
  connectStartedAt = Date.now();

  poll = setInterval(async () => {
    if (Date.now() - connectStartedAt > 8 * 60 * 1000) {
      stopPolling();
      return;
    }

    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      const next = await res.json();
      const wasConnecting = state.connecting;

      state = { ...state, ...next, apps: next.apps || [], google: next.google || [] };
      renderAll();

      if (wasConnecting && !next.connecting) {
        stopPolling();
        if (next.authenticated) showToast('Terhubung. Sesi aktif.');
        else if (next.error) showToast(next.error);
      }
    } catch {
      /* keep trying */
    }
  }, 2000);
}

function stopPolling() {
  if (poll) {
    clearInterval(poll);
    poll = null;
  }
}

/* ---------------- misc ---------------- */

function initTheme() {
  if (localStorage.getItem(THEME_KEY)) return;
  applyTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', false);
}

function applyTheme(theme, persist) {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.hidden = false;
  requestAnimationFrame(() => el.toast.classList.add('is-on'));

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.classList.remove('is-on');
    setTimeout(() => {
      el.toast.hidden = true;
    }, 240);
  }, 3200);
}

'use strict';

const LINK_KEY = 'sso.link';
const LINKS_KEY = 'sso.links';

const current = document.getElementById('current');
const currentWho = document.getElementById('currentWho');
const disconnectBtn = document.getElementById('disconnectBtn');
const linkForm = document.getElementById('linkForm');
const linkInput = document.getElementById('linkInput');
const linkSubmit = document.getElementById('linkSubmit');
const linkStatus = document.getElementById('linkStatus');
const cookieForm = document.getElementById('cookieForm');
const cookieInput = document.getElementById('cookieInput');
const submitBtn = document.getElementById('submitBtn');
const statusEl = document.getElementById('status');
const localBox = document.getElementById('localBox');
const localLogin = document.getElementById('localLogin');
const tablist = document.querySelector('.approach-tabs');
const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
const platformSwitch = document.getElementById('platformSwitch');
const platformOptions = Array.from(platformSwitch.querySelectorAll('[role="radio"]'));
const platformPanel = document.getElementById('panelLink');
const stepAction = document.getElementById('stepAction');

let state = null;
let linkBusy = false;
let platformLocked = false;
const coarsePointer = matchMedia('(pointer: coarse)');

setupTabs();
setupPlatform();
boot();

async function boot() {
  const store = readLinksStore();
  const entries = Object.entries(store.links || {});

  if (entries.length) {
    current.hidden = false;
    const email = store.email || entries[0][1].email || '';
    currentWho.textContent = `${email} · link aktif`;
    disconnectBtn.hidden = false;
  }

  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    state = await res.json();
  } catch {
    state = null;
  }

  if (!entries.length && state && state.authenticated) {
    current.hidden = false;
    currentWho.textContent = [state.name, state.email].filter(Boolean).join(' · ') || 'Akun UNESA';
    disconnectBtn.hidden = state.mode !== 'edge';
  }

  if (!entries.length && state && state.mode === 'local') {
    localBox.hidden = false;
  }
}

function setupTabs() {
  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) selectTab(tab);
  });

  tablist.addEventListener('keydown', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (!tab) return;

    const index = tabs.indexOf(tab);
    let next = null;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    else if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (event.key === 'Home') next = tabs[0];
    else if (event.key === 'End') next = tabs[tabs.length - 1];
    if (!next) return;

    event.preventDefault();
    selectTab(next, true);
  });
}

function selectTab(tab, focus = false) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(item.getAttribute('aria-controls'));
    if (panel) panel.hidden = !selected;
  }
  if (focus) tab.focus();
}

function setupPlatform() {
  platformSwitch.addEventListener('click', (event) => {
    const option = event.target.closest('[role="radio"]');
    if (option) setPlatform(option.dataset.platform, { lock: true });
  });

  platformSwitch.addEventListener('keydown', (event) => {
    const option = event.target.closest('[role="radio"]');
    if (!option) return;

    const index = platformOptions.indexOf(option);
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = platformOptions[(index + 1) % platformOptions.length];
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = platformOptions[(index - 1 + platformOptions.length) % platformOptions.length];
    } else if (event.key === 'Home') {
      next = platformOptions[0];
    } else if (event.key === 'End') {
      next = platformOptions[platformOptions.length - 1];
    }
    if (!next) return;

    event.preventDefault();
    setPlatform(next.dataset.platform, { lock: true, focus: true });
  });

  coarsePointer.addEventListener?.('change', () => {
    if (!platformLocked) setPlatform(detectPlatform());
  });

  window.addEventListener('resize', () => {
    if (!platformLocked) setPlatform(detectPlatform());
  });

  setPlatform(detectPlatform());
}

function detectPlatform() {
  return coarsePointer.matches || window.innerWidth <= 720 ? 'mobile' : 'desktop';
}

function setPlatform(name, { lock = false, focus = false } = {}) {
  if (lock) platformLocked = true;

  for (const option of platformOptions) {
    const selected = option.dataset.platform === name;
    option.setAttribute('aria-checked', String(selected));
    option.tabIndex = selected ? 0 : -1;
    if (selected && focus) option.focus();
  }

  stepAction.textContent = name === 'mobile' ? 'Tekan lama' : 'Klik kanan';
  platformPanel.dataset.platform = name;
}

function readLinksStore() {
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

  if (!raw || typeof raw !== 'object' || !raw.links) return { links: {} };

  const links = {};
  for (const [host, entry] of Object.entries(raw.links)) {
    if (!entry || typeof entry.url !== 'string') continue;
    if (!/^[\w.-]+\.[\w.-]+$/.test(host)) continue;
    if (!/^https?:\/\//.test(entry.url)) continue;
    links[host] = {
      url: entry.url,
      email: entry.email || raw.email || '',
      token: entry.token || '',
      at: Number(entry.at) || 0,
    };
  }

  return { email: raw.email || '', at: Number(raw.at) || 0, links };
}

function saveLinksStore(store) {
  const email = store.email || Object.values(store.links)[0]?.email || '';
  localStorage.setItem(LINKS_KEY, JSON.stringify({ email, at: Date.now(), links: store.links }));
  localStorage.removeItem(LINK_KEY);
}

function clearLinks() {
  localStorage.removeItem(LINKS_KEY);
  localStorage.removeItem(LINK_KEY);
}

function parseSSOLinks(input) {
  const text = String(input || '').trim();
  if (!text) return [];

  const out = [];
  const seen = new Set();
  for (const chunk of text.split(/\s+/)) {
    const link = parseSSOLink(chunk);
    if (!link) continue;
    if (seen.has(link.host)) continue;
    seen.add(link.host);
    out.push(link);
  }
  return out;
}

function parseSSOLink(text) {
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  if (!/(^|\.)unesa\.ac\.id$/.test(url.hostname) && !/(^|\.)unesa\.me$/.test(url.hostname)) return null;

  const path = decodeURIComponent(url.pathname);
  const match = path.match(/\/(?:sso\/|sso\.php\/|landing-page\/sso\/)?\/?([\w.+-]+@(?:mhs\.)?unesa\.ac\.id)\/([A-Za-z0-9_-]{40,})/i);
  if (!match) return null;

  return {
    host: url.hostname.toLowerCase(),
    email: match[1].toLowerCase(),
    token: match[2],
    url: url.href,
    at: Date.now(),
  };
}

linkForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (linkBusy) return;

  const parsed = parseSSOLinks(linkInput.value);
  if (!parsed.length) {
    setLinkStatus('Link tidak valid. Copy link dari salah satu aplikasi di dashboard SSO, bukan URL dashboard-nya.', true);
    return;
  }

  setLinkBusy(true, `Menyimpan ${parsed.length} link.`);
  const store = readLinksStore();
  for (const link of parsed) {
    store.links[link.host] = {
      url: link.url,
      email: link.email,
      token: link.token,
      at: link.at,
    };
  }
  store.email = store.email || parsed[0].email;
  saveLinksStore(store);
  setLinkStatus(`${parsed.length} link tersimpan. Mengalihkan.`);
  location.href = '/';
});

cookieForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const cookie = cookieInput.value.trim();
  if (!cookie) {
    setStatus('Cookie masih kosong.', true);
    return;
  }

  setBusy(true, 'Menghubungkan.');

  try {
    const res = await fetch('/api/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cookie }),
    });
    const data = await res.json();

    if (data.ok) {
      clearLinks();
      setStatus('Terhubung. Mengalihkan.');
      location.href = '/';
      return;
    }

    setStatus(data.error || 'Gagal menghubungkan.', true);
  } catch {
    setStatus('Gagal menghubungkan. Coba lagi.', true);
  } finally {
    setBusy(false);
  }
});

disconnectBtn.addEventListener('click', async () => {
  if (!confirm('Putuskan akun dari SSO Lite?')) return;
  setBusy(true, 'Memutuskan.');

  try {
    const store = readLinksStore();
    if (Object.keys(store.links).length) {
      clearLinks();
      try {
        await fetch('/api/logout', { method: 'POST' });
      } catch {
        /* link mode is local-only */
      }
      location.href = '/';
      return;
    }

    await fetch('/api/logout', { method: 'POST' });
    location.href = '/';
  } catch {
    setStatus('Gagal memutuskan akun.', true);
    setBusy(false);
  }
});

localLogin.addEventListener('click', async () => {
  clearLinks();
  setBusy(true, 'Menunggu login di jendela Chrome.');

  try {
    await fetch('/api/connect', { method: 'POST' });
  } catch {
    setStatus('Gagal memulai login.', true);
    setBusy(false);
    return;
  }

  const started = Date.now();
  const timer = setInterval(async () => {
    if (Date.now() - started > 8 * 60 * 1000) {
      clearInterval(timer);
      setStatus('Waktu login habis. Coba lagi.', true);
      setBusy(false);
      return;
    }

    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      const next = await res.json();
      if (!next.connecting && next.authenticated) {
        clearInterval(timer);
        location.href = '/';
      } else if (!next.connecting && next.error) {
        clearInterval(timer);
        setStatus(next.error, true);
        setBusy(false);
      }
    } catch {
      /* keep polling */
    }
  }, 2000);
});

function setStatus(text, isError) {
  statusEl.textContent = text || '';
  statusEl.classList.toggle('error', Boolean(isError));
}

function setLinkStatus(text, isError) {
  linkStatus.textContent = text || '';
  linkStatus.classList.toggle('error', Boolean(isError));
}

function setBusy(busy, text) {
  submitBtn.disabled = busy;
  localLogin.disabled = busy;
  if (text) setStatus(text);
}

function setLinkBusy(busy, text) {
  linkBusy = busy;
  linkSubmit.disabled = busy;
  if (text) setLinkStatus(text);
}

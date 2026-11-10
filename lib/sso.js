'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PROFILE_DIR = path.join(DATA_DIR, 'chrome-profile');
const ICON_DIR = path.join(DATA_DIR, 'icons');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const DASH = 'https://sso.unesa.ac.id/dashboard';
const LOGIN_TIMEOUT_MS = 8 * 60 * 1000;
const CACHE_TTL_MS = 20 * 1000;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(ICON_DIR, { recursive: true });

let ctx = null;
let ctxHeadless = null;
let page = null;
let queue = Promise.resolve();
let connecting = false;
let loginError = null;
let lastScrapeAt = 0;
let lastUrls = new Map();
let ready = false;

let state = loadState();

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { authenticated: false, email: null, name: null, nim: null, apps: [], google: [], info: [], updatedAt: 0 };
  }
}

function saveState() {
  const out = {
    authenticated: state.authenticated,
    email: state.email,
    name: state.name,
    nim: state.nim,
    apps: state.apps,
    google: state.google,
    info: state.info,
    updatedAt: state.updatedAt,
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(out, null, 2));
}

function iconFile(host) {
  return host.replace(/[^a-z0-9.-]/gi, '-').toLowerCase() + '.png';
}

async function downloadIcon(url, host) {
  if (!url) return null;
  const name = iconFile(host);
  const dest = path.join(ICON_DIR, name);
  if (!fs.existsSync(dest)) {
    try {
      const res = await ctx.request.get(url, { timeout: 15000 });
      if (!res.ok()) return null;
      const buf = Buffer.from(await res.body());
      if (buf.length > 0 && buf.length < 2 * 1024 * 1024) fs.writeFileSync(dest, buf);
      else return null;
    } catch {
      return null;
    }
  }
  return '/icons/' + name;
}

async function ensureContext(headless) {
  if (ctx && ctxHeadless === headless) return ctx;
  if (ctx) await closeContext();
  ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless,
    viewport: { width: 1280, height: 900 },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=Translate,MediaRouter',
    ],
  });
  ctxHeadless = headless;
  page = ctx.pages()[0] || (await ctx.newPage());
  return ctx;
}

async function closeContext() {
  const c = ctx;
  ctx = null;
  page = null;
  ctxHeadless = null;
  if (c) await c.close().catch(() => {});
}

async function getPage() {
  if (!ctx) throw new Error('Browser belum siap');
  if (!page || page.isClosed()) {
    page = ctx.pages().find((p) => !p.isClosed()) || (await ctx.newPage());
  }
  return page;
}

function enqueue(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function extract(p) {
  return p.evaluate(() => {
    const nameInfo = (() => {
      const el = Array.from(document.querySelectorAll('div.fw-bolder')).find((d) => {
        const t = (d.textContent || '').trim().replace(/\s+/g, ' ');
        return t.length < 120 && /\d{10,}\s+\d{2}[A-Z]?\s?\d{3}\s+[A-Za-z]/.test(t);
      });
      if (!el) return { name: null, nim: null };
      const text = el.textContent.trim().replace(/\s+/g, ' ');
      const m = text.match(/(\d{10,})\s+(.+)$/);
      if (m) return { nim: m[1], name: m[2].trim() };
      return { name: text, nim: null };
    })();

    const emailMatch = document.body.innerText.match(/[\w.+-]+@(?:mhs\.)?unesa\.ac\.id/);
    const email = emailMatch ? emailMatch[0] : null;

    const isUnesa = (host) =>
      /(^|\.)unesa\.ac\.id$/.test(host) || /(^|\.)unesa\.me$/.test(host);

    const apps = [];
    const seen = new Set();

    document.querySelectorAll('tr').forEach((tr) => {
      const titles = Array.from(tr.querySelectorAll('.menu-title'))
        .map((t) => t.textContent.trim().replace(/\s+/g, ' '))
        .filter(Boolean);
      if (!titles.length) return;

      const link = tr.querySelector('a[href]');
      if (!link) return;

      let url;
      try {
        url = new URL(link.getAttribute('href') || '', location.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol)) return;

      const host = url.hostname;
      if (!isUnesa(host) || seen.has(host)) return;
      seen.add(host);

      const title = titles[0];
      const desc = titles[1] && titles[1] !== title ? titles[1] : '';
      const img = tr.querySelector('img');

      apps.push({
        title,
        desc,
        host,
        url: url.href,
        icon: img ? img.currentSrc || img.getAttribute('src') || '' : '',
      });
    });

    if (!apps.length) {
      const tokenRe = /\/\/[^/]*@[^/]+\/[A-Za-z0-9_-]{40,}/;
      document.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute('href') || '';
        if (!href.includes('/sso/') && !tokenRe.test(href)) return;

        let url;
        try {
          url = new URL(href, location.href);
        } catch {
          return;
        }
        const host = url.hostname;
        if (!isUnesa(host) || seen.has(host)) return;

        const titleEl = a.querySelector('.menu-title');
        const title = (titleEl ? titleEl.textContent : a.textContent || '')
          .trim()
          .replace(/\s+/g, ' ');
        if (!title || title.length > 80) return;

        seen.add(host);
        const img = a.querySelector('img.icon-sso') || a.querySelector('img');
        apps.push({
          title,
          desc: '',
          host,
          url: url.href,
          icon: img ? img.currentSrc || img.getAttribute('src') || '' : '',
        });
      });
    }

    const googleMap = {
      'mail.google.com': 'Gmail',
      'drive.google.com': 'Drive',
      'meet.google.com': 'Meet',
      'classroom.google.com': 'Classroom',
      'docs.google.com': 'Docs',
    };
    const google = [];
    const gseen = new Set();
    document.querySelectorAll('a[href]').forEach((a) => {
      let url;
      try {
        url = new URL(a.getAttribute('href'), location.href);
      } catch {
        return;
      }
      const title = googleMap[url.hostname];
      if (!title || gseen.has(url.hostname)) return;
      gseen.add(url.hostname);
      const img = a.querySelector('img');
      google.push({
        title,
        desc: '',
        host: url.hostname,
        url: url.href,
        icon: img ? img.currentSrc || img.getAttribute('src') || '' : '',
      });
    });

    const info = [];
    const seenInfo = new Set();
    document.querySelectorAll('#carouselExampleControls .carousel-item').forEach((item) => {
      const titleEl = item.querySelector('h3');
      const title = titleEl ? titleEl.textContent.trim().replace(/\s+/g, ' ') : '';
      if (!title || seenInfo.has(title)) return;

      const frame = item.querySelector('iframe');
      const image = item.querySelector('img');
      let href = frame ? frame.getAttribute('src') : image ? image.getAttribute('src') : '';
      if (!href) return;

      let url;
      try {
        url = new URL(href, location.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol)) return;

      seenInfo.add(title);
      info.push({ title, url: url.href });
    });

    return { email, name: nameInfo.name, nim: nameInfo.nim, apps, google, info };
  });
}

async function doScrape({ headless = true, fresh = false } = {}) {
  if (!fresh && Date.now() - lastScrapeAt < CACHE_TTL_MS && lastUrls.size) {
    return { ok: true, cached: true };
  }

  await ensureContext(headless);
  const p = await getPage();
  await p.goto(DASH, { waitUntil: 'domcontentloaded', timeout: 45000 });

  let url = p.url();
  if (url.includes('accounts.google.com') || url.includes('/login')) {
    state.authenticated = false;
    lastUrls.clear();
    saveState();
    return { ok: false, needsLogin: true };
  }

  await p
    .waitForFunction(() => /Selamat datang/i.test(document.body.innerText), null, { timeout: 15000 })
    .catch(() => {});

  const data = await extract(p);
  if (!data.apps.length) {
    url = p.url();
    if (url.includes('accounts.google.com') || url.includes('/login')) {
      state.authenticated = false;
      lastUrls.clear();
      saveState();
      return { ok: false, needsLogin: true };
    }
  }

  const apps = [];
  const urls = new Map();
  for (const app of data.apps) {
    const icon = await downloadIcon(app.icon, app.host);
    apps.push({ id: app.host, title: app.title, desc: app.desc || '', host: app.host, icon });
    urls.set(app.host, { url: app.url, at: Date.now() });
  }

  const google = [];
  for (const app of data.google) {
    const icon = await downloadIcon(app.icon, app.host);
    google.push({ id: app.host, title: app.title, host: app.host, url: app.url, icon });
  }

  state.authenticated = true;
  state.email = data.email || state.email;
  state.name = data.name || state.name || null;
  state.nim = data.nim || state.nim || null;
  state.apps = apps;
  state.google = google;
  state.info = data.info || [];
  state.updatedAt = Date.now();
  saveState();

  lastUrls = urls;
  lastScrapeAt = Date.now();

  return { ok: true };
}

function scrape(opts) {
  return enqueue(() => doScrape(opts));
}

function parseCookieHeader(input) {
  const header = String(input || '')
    .replace(/^cookie:\s*/i, '')
    .trim();
  const pairs = header
    .split(/;\s*/)
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf('=');
      if (eq <= 0) return null;
      return { name: part.slice(0, eq).trim(), value: part.slice(eq + 1) };
    })
    .filter(Boolean);

  if (!pairs.length && /^[A-Za-z0-9%_-]{20,}$/.test(header)) {
    return [{ name: 'laravel_session', value: header }];
  }
  return pairs;
}

async function importCookie(input) {
  try {
    const result = await enqueue(async () => {
      const pairs = parseCookieHeader(input);
      if (!pairs.length) throw new Error('Cookie kosong.');

      await closeContext();
      await ensureContext(true);
      await ctx.addCookies(
        pairs.map((pair) => ({
          name: pair.name,
          value: pair.value,
          domain: 'sso.unesa.ac.id',
          path: '/',
          secure: true,
          httpOnly: true,
          sameSite: 'Lax',
        }))
      );

      return doScrape({ headless: true, fresh: true });
    });

    if (!result.ok) {
      loginError = 'Cookie tidak valid atau sesi sudah habis.';
      return { ok: false, error: loginError };
    }

    loginError = null;
    return { ok: true };
  } catch (err) {
    loginError = err.message || 'Cookie tidak valid.';
    return { ok: false, error: loginError };
  }
}

async function doLogin() {
  connecting = true;
  loginError = null;

  try {
    await closeContext();
    await ensureContext(false);
    const p = await getPage();
    await p.goto(DASH, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const started = Date.now();
    let success = false;

    while (Date.now() - started < LOGIN_TIMEOUT_MS) {
      await p.waitForTimeout(1500);
      if (!ctx) throw new Error('Jendela login ditutup');
      if (p.isClosed()) throw new Error('Jendela login ditutup');

      let current = '';
      try {
        current = p.url();
      } catch {
        throw new Error('Jendela login ditutup');
      }

      if (current.startsWith('https://sso.unesa.ac.id/dashboard')) {
        const ready = await p
          .waitForFunction(() => /Selamat datang/i.test(document.body.innerText), null, {
            timeout: 8000,
          })
          .then(() => true)
          .catch(() => false);
        if (ready) {
          success = true;
          break;
        }
      }
    }

    if (!success) throw new Error('Login tidak selesai. Coba lagi.');

    await doScrape({ headless: false, fresh: true });
    await closeContext();
  } catch (err) {
    loginError = err.message || 'Login gagal';
    await closeContext();
  } finally {
    connecting = false;
  }
}

function login() {
  if (connecting) return;
  doLogin();
}

async function launchUrl(id) {
  let entry = lastUrls.get(id);
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry.url;

  const res = await scrape({ headless: true, fresh: true });
  if (res.ok) {
    entry = lastUrls.get(id);
    if (entry) return entry.url;
  }
  if (entry) return entry.url;
  return null;
}

function getState() {
  return {
    mode: 'local',
    ready,
    authenticated: state.authenticated,
    connecting,
    error: loginError,
    email: state.email,
    name: state.name,
    nim: state.nim,
    apps: state.apps,
    google: state.google,
    info: state.info,
    updatedAt: state.updatedAt,
  };
}

function init() {
  scrape({ headless: true, fresh: true })
    .catch(() => {})
    .finally(() => {
      ready = true;
    });
  setInterval(() => {
    if (!state.authenticated || connecting) return;
    scrape({ headless: true, fresh: true }).catch(() => {});
  }, 20 * 60 * 1000);
}

module.exports = { init, getState, login, scrape, launchUrl, importCookie };

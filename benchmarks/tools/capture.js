'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4176';
const OUT = path.join(__dirname, '..', 'baseline', 'screens');
const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1280x800', width: 1280, height: 800 },
];
const LINK_VIEWPORTS = new Set(['390x844', '1280x800']);
const FAVS = ['sindig.unesa.ac.id', 'melisa.unesa.ac.id'];
const NOW = Date.now();
const FAKE_TOKEN = 'A'.repeat(48);
const LINK_STORE = {
  email: 'baseline@mhs.unesa.ac.id',
  at: NOW,
  links: {
    'sindig.unesa.ac.id': {
      url: 'https://sindig.unesa.ac.id//baseline@mhs.unesa.ac.id/' + FAKE_TOKEN,
      email: 'baseline@mhs.unesa.ac.id',
      token: FAKE_TOKEN,
      at: NOW,
    },
  },
};

const diagnostics = [];

function note(page, viewport, stage) {
  const entry = { viewport, stage, consoleErrors: [], pageErrors: [], failedRequests: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') entry.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => entry.pageErrors.push(String(err)));
  page.on('requestfailed', (req) => {
    entry.failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText || 'unknown'}`);
  });
  diagnostics.push(entry);
}

async function settle(page, ms = 450) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function snap(page, viewport, name) {
  const dir = path.join(OUT, viewport);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name + '.png');
  await page.screenshot({ path: file, fullPage: false });
  console.log(`saved ${path.relative(process.cwd(), file)}`);
}

async function seedAndReload(page, key, value) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await settle(page);
}

async function captureViewport(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    colorScheme: 'light',
  });
  const page = await context.newPage();
  note(page, vp.name, 'home-guest-favorites');

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await seedAndReload(page, 'sso.favs', JSON.stringify(FAVS));
  await page.waitForSelector('section h2:text-is("Favorit")', { timeout: 15000 });
  await page.waitForFunction(() => {
    const h = [...document.querySelectorAll('section h2')].find((e) => e.textContent === 'Favorit');
    return h && h.closest('section')?.querySelectorAll('.tile').length >= 2;
  }, { timeout: 15000 });
  await settle(page, 600);
  await snap(page, vp.name, 'home-guest-favorites');

  note(page, vp.name, 'home-campus-expanded');
  await page.locator('.campus-toggle').first().click();
  await page.waitForSelector('.campus-toggle[aria-expanded="true"]', { timeout: 15000 });
  await settle(page, 600);
  await page.evaluate(() => {
    const section = document.querySelector('.campus-toggle')?.closest('section');
    if (!section) return;
    window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY - 80);
  });
  await settle(page, 400);
  await snap(page, vp.name, 'home-campus-expanded');
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page, 250);

  note(page, vp.name, 'home-folder-overlay');
  await page.locator('.folder-card').first().click();
  await page.waitForSelector('.folder-overlay', { state: 'visible', timeout: 15000 });
  await settle(page, 1100);
  await snap(page, vp.name, 'home-folder-overlay');

  note(page, vp.name, 'connect');
  await page.goto(BASE + '/connect.html', { waitUntil: 'domcontentloaded' });
  await settle(page, 500);
  await snap(page, vp.name, 'connect');

  note(page, vp.name, 'settings');
  await page.goto(BASE + '/settings.html', { waitUntil: 'domcontentloaded' });
  await settle(page, 500);
  await snap(page, vp.name, 'settings');

  if (LINK_VIEWPORTS.has(vp.name)) {
    note(page, vp.name, 'home-link-mode');
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.evaluate(([store]) => {
      localStorage.removeItem('sso.favs');
      localStorage.setItem('sso.links', store);
    }, [JSON.stringify(LINK_STORE)]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.waitForFunction(
      (expected) => {
        const el = document.getElementById('emailLabel');
        return el && !el.hasAttribute('hidden') && el.textContent.trim() === expected;
      },
      LINK_STORE.email,
      { timeout: 15000 }
    );
    const tokenTiles = await page.locator(`a.app[href*="/${LINK_STORE.email}/"]`).count();
    if (tokenTiles < 1) throw new Error('link mode produced no tokenized app links');
    await settle(page, 600);
    await snap(page, vp.name, 'home-link-mode');
  }

  await context.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  console.log('chrome', browser.version());
  try {
    for (const vp of VIEWPORTS) {
      await captureViewport(browser, vp);
    }
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(__dirname, '..', 'baseline', 'capture-diagnostics.json'),
      JSON.stringify(diagnostics, null, 2)
    );
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

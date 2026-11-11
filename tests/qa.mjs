import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { AxeBuilder } from '@axe-core/playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.QA_PORT || 4180);
const BASE = (process.env.QA_BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, '');
const manageServer = !process.env.QA_BASE_URL;
const screenDir = process.env.QA_SCREEN_DIR || path.join(os.tmpdir(), 'sso-qa-screens');
const TILE_MIN = 8;
const FAKE_TOKEN = 'A'.repeat(48);
const FAKE_EMAIL = 'qa@mhs.unesa.ac.id';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tests = [];
let server = null;

function test(name, fn) {
  tests.push({ name, fn });
}

async function startServer() {
  if (!manageServer) return;
  server = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let log = '';
  server.stdout.on('data', (chunk) => {
    log += chunk;
  });
  server.stderr.on('data', (chunk) => {
    log += chunk;
  });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/api/state`);
      if (response.ok) return;
    } catch {
      // server is still starting
    }
    await sleep(150);
  }

  throw new Error(`local server did not start\n${log}`);
}

async function stopServer() {
  if (!server) return;
  const child = server;
  server = null;
  child.kill('SIGKILL');
  await Promise.race([once(child, 'exit'), sleep(1000)]);
}

async function newPage(browser, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1280, height: 800 },
    colorScheme: options.colorScheme || 'light',
    reducedMotion: options.reducedMotion || 'no-preference',
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const diagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [] };

  page.on('console', (msg) => {
    if (msg.type() === 'error') diagnostics.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => diagnostics.pageErrors.push(String(error)));
  page.on('requestfailed', (request) => {
    const error = request.failure()?.errorText || 'unknown';
    if (!error.includes('ERR_ABORTED')) {
      diagnostics.failedRequests.push(`${request.method()} ${request.url()} :: ${error}`);
    }
  });

  return { context, page, diagnostics };
}

async function waitForDashboard(page) {
  await page.waitForSelector('.tile', { timeout: 20000 });
  await page.waitForFunction(
    (minimum) => document.querySelectorAll('.tile').length >= minimum,
    TILE_MIN,
    { timeout: 20000 }
  );
  await page.waitForLoadState('networkidle').catch(() => {});
  await sleep(250);
}

async function gotoDashboard(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await waitForDashboard(page);
}

async function seedStorage(page, entries) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((items) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
  }, entries);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForDashboard(page);
}

function sectionByTitle(page, title) {
  return page
    .locator('section.section')
    .filter({ has: page.locator('h2', { hasText: title }) })
    .first();
}

async function assertClean(diagnostics, label) {
  assert.deepEqual(diagnostics.pageErrors, [], `${label}: page errors`);
  assert.deepEqual(diagnostics.consoleErrors, [], `${label}: console errors`);
  assert.deepEqual(diagnostics.failedRequests, [], `${label}: failed requests`);
}

function formatViolations(violations) {
  return violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help}\n  ${violation.nodes
          .map((node) => node.target.join(' '))
          .join('\n  ')}`
    )
    .join('\n');
}

async function runAxe(page, label) {
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = report.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical'
  );
  const minor = report.violations.filter(
    (violation) => violation.impact !== 'serious' && violation.impact !== 'critical'
  );
  return { label, serious, minor };
}

test('dashboard loads in guest mode', async (browser) => {
  const { context, page, diagnostics } = await newPage(browser);
  try {
    await gotoDashboard(page);

    assert.equal(await page.evaluate(() => document.documentElement.lang), 'id');
    assert.equal(await page.locator('.folder-card').count(), 5);

    for (const title of ['Kategori', 'Layanan kampus', 'Google', 'Info UNESA']) {
      assert.equal(await sectionByTitle(page, title).count(), 1, `section ${title}`);
    }

    assert.equal(await page.locator('#emailLabel').count(), 0);
    assert.match(await page.locator('.banner').first().innerText(), /Mode tamu/);
    assert.ok((await page.locator('.tile').count()) >= TILE_MIN);
    await assertClean(diagnostics, 'dashboard');
  } finally {
    await context.close();
  }
});

test('search matches aliases, compact queries, and no-results', async (browser) => {
  const { context, page, diagnostics } = await newPage(browser);
  try {
    await gotoDashboard(page);

    for (const query of ['magang', 'mehlisa', 'me li sa']) {
      await page.fill('#search', query);
      await page
        .locator('.app-title', { hasText: 'MELISA' })
        .first()
        .waitFor({ state: 'visible', timeout: 5000 });
    }

    await page.fill('#search', 'zzzz');
    await page.locator('.no-results').waitFor({ state: 'visible' });

    await page.locator('#clearBtn').click();
    await page.waitForFunction(
      (minimum) => document.querySelectorAll('.tile').length >= minimum,
      TILE_MIN
    );
    await assertClean(diagnostics, 'search');
  } finally {
    await context.close();
  }
});

test('favorites toggle and persist', async (browser) => {
  const { context, page, diagnostics } = await newPage(browser);
  try {
    await gotoDashboard(page);

    await page.locator('button.star[data-id="bebaslab.unesa.ac.id"]').first().click();
    await page.waitForFunction(() =>
      JSON.parse(localStorage.getItem('sso.favs') || '[]').includes('bebaslab.unesa.ac.id')
    );
    await sectionByTitle(page, 'Favorit').waitFor({ state: 'visible' });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForDashboard(page);
    assert.equal(
      await page
        .locator('button.star[data-id="bebaslab.unesa.ac.id"]')
        .first()
        .getAttribute('aria-pressed'),
      'true'
    );

    await sectionByTitle(page, 'Favorit')
      .locator('button.star[data-id="bebaslab.unesa.ac.id"]')
      .click();
    await page.waitForFunction(
      () => !JSON.parse(localStorage.getItem('sso.favs') || '[]').includes('bebaslab.unesa.ac.id')
    );
    await assertClean(diagnostics, 'favorites');
  } finally {
    await context.close();
  }
});

test('campus accordion expands and collapses', async (browser) => {
  const { context, page, diagnostics } = await newPage(browser);
  try {
    await gotoDashboard(page);

    const campus = sectionByTitle(page, 'Layanan kampus');
    assert.equal(await campus.locator('.tile').count(), 4);

    await campus.locator('.campus-toggle').click();
    await page.waitForFunction(
      () => document.querySelector('.campus-toggle')?.getAttribute('aria-expanded') === 'true'
    );
    assert.ok((await campus.locator('.tile').count()) > 4);

    await campus.locator('.campus-toggle').click();
    await page.waitForFunction(
      () => document.querySelector('.campus-toggle')?.getAttribute('aria-expanded') === 'false'
    );
    assert.equal(await campus.locator('.tile').count(), 4);
    await assertClean(diagnostics, 'accordion');
  } finally {
    await context.close();
  }
});

test('folder overlay opens, traps focus, and returns focus', async (browser) => {
  const { context, page, diagnostics } = await newPage(browser);
  try {
    await gotoDashboard(page);

    await page.locator('.folder-card').first().click();
    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await dialog.waitFor({ state: 'visible' });
    assert.equal(
      await page.evaluate(() => document.activeElement?.classList.contains('folder-close')),
      true
    );

    for (let index = 0; index < 6; index += 1) {
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))),
        true
      );
    }

    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    await sleep(450);
    assert.equal(
      await page.evaluate(() => Boolean(document.activeElement?.closest('.folder-card'))),
      true
    );
    await assertClean(diagnostics, 'folder overlay');
  } finally {
    await context.close();
  }
});

test('settings opens without navigation, reorders, hides, and resets', async (browser) => {
  const { context, page, diagnostics } = await newPage(browser);
  try {
    await gotoDashboard(page);

    const navigationCount = await page.evaluate(
      () => performance.getEntriesByType('navigation').length
    );
    const url = page.url();

    await page.locator('#menuBtn').click();
    await page.locator('button.menu-item').last().click();
    const drawer = page.locator('.settings-drawer');
    await drawer.waitFor({ state: 'visible' });

    assert.equal(page.url(), url);
    assert.equal(
      await page.evaluate(() => performance.getEntriesByType('navigation').length),
      navigationCount
    );

    const names = () => page.locator('.settings-list .settings-name').allTextContents();
    assert.deepEqual(await names(), [
      'Kategori',
      'Favorit',
      'Layanan kampus',
      'Google',
      'Info UNESA',
    ]);

    await page.locator('.settings-row .drag-handle').first().focus();
    await page.keyboard.press('Space');
    await sleep(150);
    await page.keyboard.press('ArrowDown');
    await sleep(150);
    await page.keyboard.press('Space');
    await sleep(400);

    const reordered = await names();
    assert.deepEqual(reordered.slice(0, 2), ['Favorit', 'Kategori']);
    const order = await page.evaluate(
      () => JSON.parse(localStorage.getItem('sso.sections') || '{}').order
    );
    assert.deepEqual(order.slice(0, 2), ['favorites', 'folders']);

    await page.locator('.settings-foot .btn').first().click();
    await sleep(200);
    assert.deepEqual(await names(), [
      'Kategori',
      'Favorit',
      'Layanan kampus',
      'Google',
      'Info UNESA',
    ]);

    await page
      .locator('.settings-row')
      .filter({ hasText: 'Google' })
      .first()
      .locator('.switch input')
      .click();
    await sleep(200);
    const hidden = await page.evaluate(
      () => JSON.parse(localStorage.getItem('sso.sections') || '{}').hidden
    );
    assert.ok(hidden.includes('google'));

    await page.locator('.settings-foot .btn.primary').click();
    await drawer.waitFor({ state: 'detached' });
    await sleep(300);
    assert.equal(await sectionByTitle(page, 'Google').count(), 0);

    await page.locator('#menuBtn').click();
    await page.locator('button.menu-item').last().click();
    await page.locator('.settings-drawer').waitFor({ state: 'visible' });
    await page.locator('.settings-foot .btn').first().click();
    await sleep(200);
    assert.equal(await page.locator('.settings-row .switch input:checked').count(), 5);
    await assertClean(diagnostics, 'settings');
  } finally {
    await context.close();
  }
});

test('language switch persists and applies', async (browser) => {
  const { context, page, diagnostics } = await newPage(browser);
  try {
    await gotoDashboard(page);
    await page.locator('#menuBtn').click();
    await page.locator('button.menu-item').last().click();
    await page.locator('.settings-drawer').waitFor({ state: 'visible' });

    await page.locator('.lang-switch button', { hasText: 'EN' }).click();
    await sleep(250);
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
    assert.equal(await page.locator('.settings-title').innerText(), 'Settings');
    assert.equal(await page.evaluate(() => localStorage.getItem('sso.lang')), 'en');

    await page.locator('.settings-foot .btn.primary').click();
    await sleep(400);
    assert.match(await page.locator('#greeting').innerText(), /^Hello,/);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForDashboard(page);
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
    assert.equal(await page.evaluate(() => localStorage.getItem('sso.lang')), 'en');
    await assertClean(diagnostics, 'language');
  } finally {
    await context.close();
  }
});

test('link mode renders tokenized links and email', async (browser) => {
  const { context, page, diagnostics } = await newPage(browser);
  try {
    const now = Date.now();
    const store = {
      email: FAKE_EMAIL,
      at: now,
      links: {
        'sindig.unesa.ac.id': {
          url: `https://sindig.unesa.ac.id//${FAKE_EMAIL}/${FAKE_TOKEN}`,
          email: FAKE_EMAIL,
          token: FAKE_TOKEN,
          at: now,
        },
      },
    };

    await seedStorage(page, { 'sso.links': JSON.stringify(store) });
    assert.equal(await page.locator('#emailLabel').innerText(), FAKE_EMAIL);
    assert.ok(
      (await page.locator(`a.app[href*="/${FAKE_EMAIL}/"]`).count()) >= 1,
      'no tokenized links'
    );
    assert.match(await page.locator('#footStatusText').innerText(), /Link aktif/);
    await assertClean(diagnostics, 'link mode');
  } finally {
    await context.close();
  }
});

test('theme toggle persists', async (browser) => {
  const { context, page, diagnostics } = await newPage(browser);
  try {
    await gotoDashboard(page);
    const before = await page.evaluate(
      () => document.documentElement.dataset.theme || 'light'
    );
    await page.locator('#themeBtn').click();
    await sleep(200);
    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    assert.equal(after, before === 'dark' ? 'light' : 'dark');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForDashboard(page);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), after);
    await assertClean(diagnostics, 'theme');
  } finally {
    await context.close();
  }
});

test('keyboard shortcuts focus and clear search', async (browser) => {
  const { context, page, diagnostics } = await newPage(browser);
  try {
    await gotoDashboard(page);
    await page.keyboard.press('/');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'search');

    await page.fill('#search', 'magang');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#search').inputValue(), '');
    await assertClean(diagnostics, 'keyboard');
  } finally {
    await context.close();
  }
});

test('connect tabs and FAQ content work', async (browser) => {
  const { context, page, diagnostics } = await newPage(browser);
  try {
    await page.goto(`${BASE}/connect.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('#panelLink').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#panelCookie').isVisible(), false);

    await page.locator('#tabCookie').click();
    assert.equal(await page.locator('#panelCookie').isVisible(), true);
    assert.equal(await page.locator('#tabCookie').getAttribute('aria-selected'), 'true');

    await page.locator('#tabLink').click();
    assert.equal(await page.locator('#panelLink').isVisible(), true);

    await page.goto(`${BASE}/faq.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('.faq-item').first().waitFor();
    assert.ok(
      (await page.locator('a[href*="github.com/keroyokan-com/sso"]').count()) >= 3,
      'FAQ GitHub links missing'
    );

    await page.locator('.faq-item summary').first().click();
    assert.equal(await page.locator('.faq-item').first().getAttribute('open'), '');
    await assertClean(diagnostics, 'connect/faq');
  } finally {
    await context.close();
  }
});

test('accessibility: dashboard, settings, folder, connect, FAQ', async (browser) => {
  const reports = [];
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  try {
    await gotoDashboard(page);
    reports.push(await runAxe(page, 'dashboard light'));

    await page.locator('#menuBtn').click();
    await page.locator('button.menu-item').last().click();
    await page.locator('.settings-drawer').waitFor({ state: 'visible' });
    reports.push(await runAxe(page, 'settings'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    await page.locator('.folder-card').first().click();
    await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
    reports.push(await runAxe(page, 'folder dialog'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(450);

    await page.goto(`${BASE}/connect.html`, { waitUntil: 'domcontentloaded' });
    reports.push(await runAxe(page, 'connect'));

    await page.goto(`${BASE}/faq.html`, { waitUntil: 'domcontentloaded' });
    reports.push(await runAxe(page, 'faq'));
  } finally {
    await context.close();
  }

  const serious = reports.flatMap((report) =>
    report.serious.map((violation) => ({ ...violation, label: report.label }))
  );
  const minor = reports.flatMap((report) =>
    report.minor.map((violation) => ({ ...violation, label: report.label }))
  );

  if (minor.length) {
    console.log(
      `axe minor/moderate findings:\n${minor
        .map((violation) => `${violation.label}: ${violation.id} (${violation.impact})`)
        .join('\n')}`
    );
  }

  assert.equal(
    serious.length,
    0,
    `axe serious/critical findings:\n${serious
      .map((violation) => `${violation.label}: ${formatViolations([violation])}`)
      .join('\n')}`
  );
});

test('visual checks at 390/768/1280 light and dark', async (browser) => {
  const viewports = [
    { name: '390x844', width: 390, height: 844 },
    { name: '768x1024', width: 768, height: 1024 },
    { name: '1280x800', width: 1280, height: 800 },
  ];

  for (const viewport of viewports) {
    for (const colorScheme of ['light', 'dark']) {
      const { context, page, diagnostics } = await newPage(browser, {
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme,
        reducedMotion: 'reduce',
      });

      try {
        await gotoDashboard(page);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1
        );
        assert.equal(overflow, false, `${viewport.name} ${colorScheme}: horizontal overflow`);
        assert.equal(await page.locator('#search').isVisible(), true);
        assert.equal(await page.locator('.folder-card').first().isVisible(), true);
        assert.equal(await page.locator('.tile').first().isVisible(), true);

        const file = path.join(screenDir, `${viewport.name}-${colorScheme}.png`);
        await page.screenshot({ path: file, fullPage: false });
        await assertClean(diagnostics, `visual ${viewport.name} ${colorScheme}`);
      } finally {
        await context.close();
      }
    }
  }
});

async function main() {
  await startServer();
  let browser = null;
  const results = [];
  let failures = 0;

  try {
    browser = await chromium.launch({ channel: process.env.QA_CHANNEL || 'chrome' });
    console.log(`chrome ${browser.version()}`);

    for (const { name, fn } of tests) {
      const started = Date.now();
      try {
        await fn(browser);
        results.push({ name, ok: true, ms: Date.now() - started });
        console.log(`PASS ${name}`);
      } catch (error) {
        failures += 1;
        results.push({
          name,
          ok: false,
          ms: Date.now() - started,
          error: error?.stack || String(error),
        });
        console.error(`FAIL ${name}\n${error?.stack || error}`);
      }
    }
  } finally {
    if (browser) await browser.close();
    await stopServer();
  }

  console.log(
    JSON.stringify(
      {
        base: BASE,
        screens: screenDir,
        passed: results.length - failures,
        failed: failures,
        results,
      },
      null,
      2
    )
  );

  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

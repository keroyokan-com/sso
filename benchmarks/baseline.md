# Phase 0 baseline

- Date: 2026-11-10, ~17:20–17:34 WIB (UTC+7)
- App commit under test: `eb1386eac8868290159bc7072cb99b7cb1311e03` ("Initial import of SSO Lite")
- Branch: `t3/phase-0-baseline-metrics`
- Environment: Windows 11 Pro 10.0.26200 (64-bit), AMD Ryzen 7 5800H (8C/16T), Node 24.13.0, npm 11.6.2, Chrome 157.0.8103.38, playwright-core 1.65.0, esbuild 0.28.2, Lighthouse 13.6.0.
- Server: `npm start` → `http://127.0.0.1:4176`. Port 4173 was already occupied by another instance, so this run used 4176. The server's background headless Chrome SSO scrape started, but the served state stayed unauthenticated (guest), which is sufficient for this baseline.
- Method: Lighthouse 13.6.0 mobile default preset (mobile form factor, simulated throttling), one run per page. Screenshots via Playwright with the installed Chrome channel at 1x device scale, light color scheme. No application code, `package.json`, or `package-lock.json` was changed.

## Lighthouse (mobile)

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | Speed Index |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 75 | 100 | 100 | 100 | 2.72 s | 0.45 | 16.5 ms | 2.01 s |
| `/connect.html` | 99 | 100 | 100 | 54 | 1.58 s | 0 | 79 ms | 0.91 s |
| `/settings.html` | 100 | 100 | 100 | 50 | 0.91 s | 0 | 0 ms | 0.91 s |

Reports: `baseline/lighthouse/home-mobile.json`, `baseline/lighthouse/connect-mobile.json`, `baseline/lighthouse/settings-mobile.json`.

Lighthouse reported TBT as 20 ms / 80 ms / 0 ms and Speed Index as 2.0 s / 0.9 s / 0.9 s; the table uses the underlying numeric values (16.5 ms, 79 ms, 0 ms).

## Payload

On-disk bytes. The local server sends these files uncompressed, so raw bytes are the transfer payload (plus HTTP headers). Screenshots are under `benchmarks/` and are not part of these totals.

| Asset group | Files | Bytes | KiB |
|---|---:|---:|---:|
| `public/app.js` | 1 | 106,211 | 103.7 |
| `public/styles.css` | 1 | 28,209 | 27.5 |
| `public/fonts/*` | 2 | 31,843 | 31.1 |
| `public/app-icons/*.png` | 39 | 398,917 | 389.6 |
| **Total, specified assets** | **43** | **565,180** | **551.9** |
| All of `public/*` | 52 | 632,954 | 618.1 |

- `public/fonts/*` includes `OFL.txt` (4,495 B). Only the WOFF2 (27,348 B) is requested by the app.
- Gzip potential for the text assets: `app.js` 37,598 B, `styles.css` 5,580 B.
- Icons dominate the specified asset payload: 39 PNGs, 398,917 B (70.6% of the specified total). Icons are lazy-loaded, so not every icon is fetched on the first viewport.
- Lighthouse's runtime `total-byte-weight` for the `/` first load was 518 KiB (HTML, CSS, JS, font, logo, state request, and the icons actually loaded).
- Full machine-readable payload: `baseline/payload.json`.

Largest 10 app icons:

| File | Bytes |
|---|---:|
| `app-icons/neoyudisium.unesa.ac.id.png` | 19,377 |
| `app-icons/sindig.unesa.ac.id.png` | 17,503 |
| `app-icons/sipena2.unesa.ac.id.png` | 16,633 |
| `app-icons/pkkmb.unesa.ac.id.png` | 16,173 |
| `app-icons/melisa.unesa.ac.id.png` | 16,152 |
| `app-icons/e-audit.unesa.ac.id.png` | 14,278 |
| `app-icons/iopac.unesa.ac.id.png` | 13,753 |
| `app-icons/simpmw.unesa.ac.id.png` | 12,680 |
| `app-icons/simpkm.unesa.ac.id.png` | 12,508 |
| `app-icons/vmsul.unesa.ac.id.png` | 12,429 |

## Screenshots

All screenshots are viewport captures (not full page), PNG, 1x DPR, light theme.

- `390x844`: `home-guest-favorites.png`, `home-campus-expanded.png`, `home-folder-overlay.png`, `home-link-mode.png`, `connect.png`, `settings.png`
- `768x1024`: `home-guest-favorites.png`, `home-campus-expanded.png`, `home-folder-overlay.png`, `connect.png`, `settings.png`
- `1280x800`: `home-guest-favorites.png`, `home-campus-expanded.png`, `home-folder-overlay.png`, `home-link-mode.png`, `connect.png`, `settings.png`

Files live under `baseline/screens/<viewport>/`. `home-campus-expanded.png` is scrolled so the expanded “Layanan kampus” section is visible; the other home captures are at scroll position 0. Guest favorites used `sso.favs = ["sindig.unesa.ac.id","melisa.unesa.ac.id"]`. Link mode used a fake store only: `baseline@mhs.unesa.ac.id` with a 48-character `A` token; no real tokens or cookies were used. At 390 px the account email is hidden by CSS, so link mode there was verified through the DOM email value and tokenized app `href`s; at 1280 px the email is visible.

Capture diagnostics: `baseline/capture-diagnostics.json` (no console errors, page errors, or failed requests in any capture).

## Observations

1. `/` is the clear performance outlier: 75 Performance versus 99/100 for the two secondary pages, driven by LCP 2.72 s, CLS 0.45, and a 2.01 s Speed Index.
2. The entire home CLS is attributed to `body > main.wrap > div#sectionHost`: the 8-tile skeleton is replaced by the folder/grid content after `/catalog.json` resolves. This is the largest single scoring issue on the baseline home page.
3. The home LCP element is the guest-mode banner text (`main.wrap > div#bannerHost > div.banner > span.grow`), not an image.
4. Lighthouse home flags an estimated 75 KiB unused JavaScript and 12 KiB unused CSS; both secondary pages flag about 23 KiB unused CSS.
5. Accessibility scores are 100 on all three pages. Lighthouse still reports a zero-weight `label-content-name-mismatch` for the guest greeting name button (`aria-label="Atur nama tampilan"` against visible “nama kamu”); it does not affect the Accessibility score.
6. SEO is 100 on `/` but 54 on `/connect.html` and 50 on `/settings.html`: both secondary pages declare `<meta name="robots" content="noindex">` and have no meta description.
7. Guest home rendered 35 campus apps, 4 Google apps, and 5 folders. The two seeded favorites produced a “Favorit” section with MELISA and SIDIA.
8. Link mode rendered the expected account email and tokenized service links from the fake store; no credentials left the browser.
9. No console errors, uncaught page errors, or failed requests were observed during any screenshot capture.
10. Bundle/icon weight, not HTML or CSS, is the payload theme: `app.js` is 103.7 KiB and the 39 PNG icons are 389.6 KiB, while `styles.css` is 27.5 KiB. The icon set is a natural target for the roadmap's WebP/AVIF derivative step.

## Reproduce

```powershell
npm ci
$env:PORT = 4176
npm start
node benchmarks/tools/capture.js
node benchmarks/tools/payload.js
npx --yes lighthouse http://127.0.0.1:4176/ --output=json --output-path=benchmarks/baseline/lighthouse/home-mobile.json --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage"
```

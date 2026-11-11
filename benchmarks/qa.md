# QA, accessibility, and performance pass

Run 2026-11-11 on Windows with Chrome 157.0.8103.40 against the built app served by `node server.js`.

## Automated suite

`npm run test:qa` — 13/13 pass:

- dashboard loads in guest mode, 5 folders, sections, no email, guest banner
- search finds MELISA for `magang`, `mehlisa`, `me li sa`; no-results state and clear
- favorites toggle, persist across reload, and remove
- campus accordion expands and collapses back to 4 cards
- folder overlay opens, traps Tab focus, closes on Escape, returns focus
- settings opens without a document navigation, keyboard-reorders, hides, and resets
- EN/ID switch persists and applies after reload
- link mode renders the stored email and tokenized links
- theme toggle persists
- `/` and Escape keyboard shortcuts
- connect tabs and FAQ GitHub links
- axe accessibility scans
- visual checks at 390x844, 768x1024, and 1280x800 in light and dark

CI: `.github/workflows/qa.yml` runs the search tests, build, and `npm run test:qa` on pushes and pull requests.

## Accessibility

- axe (WCAG 2.0/2.1 A and AA) on dashboard, settings drawer, folder dialog, connect, and FAQ: 0 serious/critical and 0 moderate/minor findings.
- Fixed `label-content-name-mismatch` on the greeting name button and the ID/EN switch by including the visible text in their accessible names.
- Lighthouse accessibility: 100.
- Keyboard pass covers settings drag/drop, folder dialog focus trap, search shortcut, and drawer focus return.

## Visual checks

390/768/1280 at light and dark: no horizontal overflow, search, folder row, and tiles visible. The QA script writes screenshots to `QA_SCREEN_DIR` (default OS temp) for inspection; they are not committed.

## Lighthouse

| Run | Perf | A11y | BP | SEO | FCP | LCP | CLS | TBT | Bytes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mobile, default slow 4G | 92 | 100 | 100 | 100 | 2.66 s | 2.66 s | 0 | 30 ms | 437 KiB |
| mobile, fast 4G (9/1.5 Mbps, 40 ms, 4x CPU) | 100 | 100 | 100 | 100 | 0.96 s | 1.30 s | 0 | 66 ms | 437 KiB |
| desktop | 100 | 100 | 100 | 100 | 0.50 s | 0.50 s | 0 | 0 ms | 437 KiB |

Baseline for comparison: mobile Performance 75, LCP 2.72 s, CLS 0.45.

Budget: fast 4G LCP 1.30 s meets the < 1.5 s target, and CLS is 0. The default slow-4G mobile run still reports 2.66 s LCP, essentially unchanged from the 2.72 s baseline; the SPA is client-rendered, so FCP and LCP land together. A static shell, earlier preload, or a smaller icon font would be needed to move the slow-4G number.

Reports: `benchmarks/qa/lighthouse-home-mobile.json`, `benchmarks/qa/lighthouse-home-fast4g.json`, `benchmarks/qa/lighthouse-home-desktop.json`.

## Reproduce

```bash
npm ci
npm run test:search
npm run build
npm run test:qa
```

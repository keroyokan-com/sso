# Roadmap, Svelte SPA port

## Status

Roadmap tracker: [#11](https://github.com/keroyokan-com/sso/issues/11). Feature PR: [#1](https://github.com/keroyokan-com/sso/pull/1).

- [x] Phase 0 — Baseline
- [x] Phase 1 — Scaffold
- [x] Phase 2 — Shell (menu alignment follow-up: [#2](https://github.com/keroyokan-com/sso/issues/2))
- [x] Phase 3 — Dashboard (search follow-up: [#4](https://github.com/keroyokan-com/sso/issues/4); accordion bug: [#15](https://github.com/keroyokan-com/sso/issues/15))
- [x] Phase 4 — Settings drawer (i18n: [#6](https://github.com/keroyokan-com/sso/issues/6); drawer animation: [#5](https://github.com/keroyokan-com/sso/issues/5); dnd-kit sort: [#22](https://github.com/keroyokan-com/sso/issues/22))
- [x] Phase 5 — Images (Google icon bug: [#3](https://github.com/keroyokan-com/sso/issues/3))
- [x] Search quality module (14 tests)
- [x] Phase 6 — Motion ([#5](https://github.com/keroyokan-com/sso/issues/5); swipe bug: [#16](https://github.com/keroyokan-com/sso/issues/16))
- [ ] Phase 7 — Modes and API ([#7](https://github.com/keroyokan-com/sso/issues/7); connect onboarding: [#17](https://github.com/keroyokan-com/sso/issues/17); tabs: [#25](https://github.com/keroyokan-com/sso/issues/25))
- [ ] Phase 8 — QA, accessibility, performance ([#8](https://github.com/keroyokan-com/sso/issues/8))
- [ ] Phase 9 — Deploy the SPA ([#9](https://github.com/keroyokan-com/sso/issues/9))
- [ ] Phase 10 — Deploy badges and GitHub-connected hosting ([#10](https://github.com/keroyokan-com/sso/issues/10); README/docs: [#18](https://github.com/keroyokan-com/sso/issues/18))

## Goal

Keep the current SSO Lite dashboard but give it a true SPA feel: no full document reloads, instant settings, sortable sections, optimized images, and the same light/dark monochrome design.

## Why

The current settings page is a separate HTML document, so opening it reloads CSS, fonts, JS, and the document — hence the ~1s pause. A framework alone would not fix that; moving settings into the app shell does. This port also gives us a cleaner component model for the growing UI (folders, favorites, accordion, settings).

## Current stack

- Vanilla HTML/CSS/JS; `src/app.js` bundled with esbuild to `public/app.js`.
- Motion (`motion` 14) for the folder overlay fly/spring.
- Node server + Playwright for local login/scraping.
- Cloudflare Worker + Workers KV + static assets, cron, Wrangler.
- Local state: `localStorage` (`sso.theme`, `sso.name`, `sso.favs`, `sso.links`, `sso.sections`).

## Target stack

- **Svelte 5 + Vite SPA** (no SvelteKit/SSR).
- **`@dnd-kit-svelte/core` + `@dnd-kit-svelte/sortable`** for the settings sortable (Svelte 5, v0.0.11); drag overlay ghost, dashed placeholder, keyboard sensor, reduced motion. Chosen over SortableJS/zero-dep for the dnd-kit interaction.
- **Motion** stays for folder overlay animation.
- **sharp** (build-only) for image derivatives: 48/96px WebP + AVIF, plus `srcset`/`sizes`.
- Existing backend unchanged: `server.js` + `lib/sso.js` local, `worker/index.js` + KV remote, same `/api/state`, `/api/connect`, `/go`, cron.
- No CSS framework; reuse the design tokens in `styles.css`.

## Non-goals

- No SSR/hydration, no Next/Remix, no database changes.
- No change to the SSO token/link behavior.
- No redesign of the visual language.

## Phases

### 0. Baseline

- Record Lighthouse (mobile) for `/`, `/connect`, `/settings`.
- Record current bundle sizes and icon payload.
- Capture screenshots of every section at 390px, 768px, 1280px.
- Baseline recorded 2026-11-10: [`benchmarks/baseline.md`](benchmarks/baseline.md). Home mobile: Performance 75, LCP 2.72 s, CLS 0.45; `app.js` 103.7 KiB; icons 389.6 KiB.

### 1. Scaffold

- Add `svelte`, `@sveltejs/vite-plugin-svelte`, `vite`.
- `vite.config.js` outputs to `public/` (or a `dist/` served by the Worker); keep the Worker assets binding and redirects.
- Keep the vanilla app available at `/legacy` during the port for comparison.

### 2. Shell and design tokens

- Port header, logo, theme, name editing, footer, toasts.
- Reuse `styles.css` tokens; split component styles.
- Theme boot script before paint (no flash).
- Done 2026-11-10: Svelte shell at `/next/` with header, name editing, theme, search shortcuts, menu popover, footer link state, and toasts; 68 Playwright checks plus an independent 390/1280 pass.
- [x] Desktop header menu alignment: open under the hamburger, not at the viewport edge ([#2](https://github.com/keroyokan-com/sso/issues/2)).

### 3. Dashboard components

- Search + keyboard navigation.
- Search quality:
  - normalize case, diacritics, punctuation, and whitespace; compact matching: `me li sa` → MELISA.
  - typo tolerance (small edit distance): `mehlisa` → MELISA.
  - per-app aliases/keywords: `magang` → MELISA (Merdeka Belajar Kampus Merdeka).
  - rank exact/prefix/compact matches above fuzzy matches across title, desc, host, and keywords.
  - tests: `mehlisa`, `me li sa`, and `magang` all surface MELISA; exact names still rank first; keep the no-results state.
- Search module landed 2026-11-10: `app/src/lib/search.mjs` + 14 Node tests (`npm run test:search`); wire it into the dashboard in this phase.
- [x] Search follow-up: `MAG`/`maga`/`mbkm` should surface MELISA; add alias-prefix matching and catalog keywords ([#4](https://github.com/keroyokan-com/sso/issues/4)).
- [x] Campus accordion: the collapsed state still renders all cards; fix and test card counts, not just `aria-expanded` ([#15](https://github.com/keroyokan-com/sso/issues/15)).
- Done 2026-11-10: dashboard at `/next/` (guest/link modes, folders, favorites, accordion, search, image srcsets, folder dialog); search module wired; Lighthouse mobile CLS 0, A11y/BP 100.
- Folder cards/row with horizontal scroll, snap, and the dynamic feathered edges (start/mid/end).
- Section hosts/order/hidden state: Kategori, Favorit, Layanan kampus, Google, Info UNESA.
- Layanan kampus accordion (4 visible, Lihat semua/tampilkan lebih sedikit) and favorites.
- Guest/link/cookie modes and the per-app link store.
- Fix the baseline home CLS 0.45 from the skeleton-to-content swap in `#sectionHost`; keep placeholder geometry stable when `/catalog.json` resolves.

### 4. Settings drawer (no reload)

- Replace `/settings.html` with an in-app drawer/dialog opened by the gear.
- Sortable list (Kategori, Favorit, Layanan kampus, Google, Info UNESA) with:
  - drag/reorder, touch and pointer,
  - show/hide switches with the fixed contrast,
  - reset,
  - immediate apply and persist to `sso.sections`.
- Remove the full-page settings navigation; keep a redirect for old links.
- Add an EN/ID language switch (drawer and/or header), persist sso.lang, translate UI/FAQ/connect/settings.
- Acceptance: opening settings is a same-document paint, no network navigation.
- Done 2026-11-10: in-app settings drawer (reorder, show/hide, reset, pointer + keyboard, live apply, focus trap); EN/ID switch still pending.
- [x] Drawer opening animation with `vaul-svelte`; evaluate side drawer vs bottom sheet ([#5](https://github.com/keroyokan-com/sso/issues/5)).
- [ ] EN/ID language switch, persist `sso.lang` ([#6](https://github.com/keroyokan-com/sso/issues/6)).
- [x] Drag/sort polish with `@dnd-kit-svelte/core` + `@dnd-kit-svelte/sortable`: drag overlay ghost, dashed "Pindah: <name>" placeholder, list animation, keyboard sensor, Vaul-safe ([#22](https://github.com/keroyokan-com/sso/issues/22)).

### 5. Images

- Build script: `sharp` produces `{48,96}` WebP/AVIF for every `app-icons/*.png`.
- Components emit `<img srcset sizes width height loading decoding>`:
  - eager for folder previews above the fold,
  - lazy for the long service list and Google/hidden sections.
- Keep SVG logo/guide; preload only the font and above-fold icons.
- Measure icon bytes before/after.
- Done 2026-11-10 on the vanilla app: 156 derivatives (39 icons × 48/96 × WebP/AVIF), 274,411 B total vs 398,917 B PNG; Lighthouse total byte weight 518 → 249 KiB. Home LCP/CLS still dominated by the banner text and skeleton swap.
- [x] Fix black bars in Drive/Meet/Classroom icons; regenerate the 48/96 derivatives ([#3](https://github.com/keroyokan-com/sso/issues/3)).

### 6. Motion

- Keep folder open/close fly + spring; ensure reduced-motion fallback.
- Use Svelte transitions for drawer/settings only where Motion isn’t needed.
- No layout thrash on section reorder.
- [x] Ported the folder fly/spring; Vaul settings drawer with mobile X-left background; reduced-motion; CLS 0.
- [x] Add the settings drawer opening animation with `vaul-svelte` (coordinate with phase 4) ([#5](https://github.com/keroyokan-com/sso/issues/5)).
- [x] Fix the Vaul mobile swipe-close/reopen desync; keep the drawer open state in sync with the background animation ([#16](https://github.com/keroyokan-com/sso/issues/16)).
- Reduced-motion fallback; keep CLS at 0.

### 7. Modes and API

- Port link-token store and guest fallback; no API changes required.
- Keep cookie/local flows working; local `npm start` unchanged.
- Ensure the SPA works when `/api/state` fails (guest/catalog).
- [ ] Redesign `/connect` as a stepper; simplify `link-guide.svg` to the page palette, focus on Copy link address + SIDIA, and cut repetitive copy ([#17](https://github.com/keroyokan-com/sso/issues/17)).
- [ ] Connect approach tabs with platform-aware instructions: Link/Cookie folder tabs, mobile/desktop step copy, cookie form in its tab ([#25](https://github.com/keroyokan-com/sso/issues/25)).

### 8. QA

- Playwright: dashboard, folder overlay, search, favorite, accordion, settings reorder/hide/reset, link mode, guest mode.
- Visual checks at 390/768/1280; dark/light.
- Lighthouse budget: no full-page navigation for settings; LCP < 1.5s on fast 4G; CLS ~0.
- Keyboard/screen-reader pass for settings drag (SortableJS fallback buttons if needed).

### 9. Deploy

- Build SPA; deploy Worker + assets; keep cron.
- Bump a cache-busting version for assets.
- Smoke test the deployed link/guest/settings flows.

### 10. Final: deploy badges and GitHub-connected hosting

- Keep the public repo at <https://github.com/keroyokan-com/sso> on `main`; it is the template source.
- Connect the existing Cloudflare Worker (`sso-lite`) to the repo with Workers Builds:
  - install the Cloudflare GitHub App on the repo,
  - build command `npm ci && npm run build`,
  - deploy command `npx wrangler deploy`,
  - production branch `main`.
- Add a Vercel project for the static SPA (guest + link modes; cookie mode and `/go/` stay on the Worker or local server).
- Put the official **Deploy to Cloudflare** and **Deploy to Vercel** badges/buttons in `README.md` directly below the title (`# sso by keroyokan`), above the description.
- Acceptance:
  - both badges render above the fold and link to working one-click deploy flows,
  - a fresh fork can deploy the Worker via the Cloudflare button and the SPA via the Vercel button,
  - a push to `main` triggers the Worker build/deploy and the deployed guest/link flows pass smoke tests,
  - Vercel serves the SPA at the root; `/api/*` and `/go/*` are documented as Worker/local-only,
  - the README deploy sections point at the badges instead of "will be added".
- Manual, one-time account steps: Cloudflare GitHub App install, Workers Builds connection, and Vercel project import all require account-owner consent in the browser; Wrangler/API cannot complete the OAuth handshake.
- [ ] Keep README simple; move self-hosting/deploy details to `docs/self-hosting.md` with the logo above the title, link it from README, and add desktop/mobile screenshots after all phases ([#18](https://github.com/keroyokan-com/sso/issues/18)).

## Acceptance criteria

- Settings opens instantly with no document navigation.
- Section order/hide persists and applies on reload.
- Favorit is its own reorderable section.
- Mobile folder row remains left aligned, horizontally scrollable, with edge fades.
- Search returns MELISA for `mehlisa`, `me li sa`, and `magang`, while exact matches still rank first.
- Image payload is reduced vs current PNG-only set.
- All existing flows (link per app, guest, cookie, folder overlay) pass.
- EN/ID switch persists and applies to app/FAQ/connect/settings copy.
- Settings drag shows a floating ghost and dashed placeholder, with keyboard support and reduced-motion fallback.
- README shows the Deploy to Cloudflare and Deploy to Vercel badges directly below the title.

## Dependencies to evaluate at implementation time

- `svelte`, `vite`, `@sveltejs/vite-plugin-svelte`
- `motion`
- `sortablejs` (or zero-dep pointer sorter)
- Search: custom normalization + alias map + small edit-distance scoring; add Fuse.js only if needed (smallest dependency).
- `sharp` (dev/build only)
- Optional: `dnd-kit-svelte` only if we need richer a11y drag.

## Open questions

- Keep `/connect` as a static page or move it into the SPA?
- Keep the legacy vanilla app during migration or switch at once?
- Do we need a tiny router for deep links (`/settings`), or is the drawer enough?
- Image format/fallback policy (AVIF + WebP + PNG fallback?).
- Language switch placement (header, settings, or both), and whether to translate README/roadmap too?
- Where do search aliases/keywords live: a `keywords` field in `catalog.json`, generated from descriptions, or a manual map?

## First next step

Port the app shell and the settings drawer first; that removes the ~1s settings reload and validates the SPA approach before porting every component.

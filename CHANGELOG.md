# changelog

notable changes to sso by keroyokan. versions follow semver; beta tags are published as pre-releases.

## unreleased

- nothing yet.

## 1.0.0-beta.1 - 2026-11-11

first beta of the svelte rewrite. the launcher does the same job as before, just without the page reloads.

### what's new

- the app is at `/` now. the old vanilla app is still at `/legacy/`; `/next/` redirects to `/`.
- settings opens in a drawer instead of a new page. reorder with the grip, hide sections, reset; pointer and keyboard both work, with a floating ghost and a dashed `Pindah: <name>` placeholder.
- guest, link, cookie, and local modes work again: `/api/state` polling, `/api/refresh`, expired sessions, the per-app link store, and local `/go/` links.
- the connect page has link/cookie tabs and platform-aware steps.
- search is smarter: aliases, prefixes, catalog keywords, and typo tolerance. exact titles still win.
- folders, favorites, the campus accordion, theme, and the persisted EN/ID switch all carry over.
- self-hosting is documented end to end: Workers Builds previews on every PR, a Vercel static path, deploy buttons, screenshots, and a self-host guide.

### under the hood

- svelte 5 + vite; vaul for the drawer; dnd-kit-svelte for sorting; a Cloudflare Worker with KV and a cron trigger.
- qa is 13 playwright checks plus axe. lighthouse mobile fast 4g: lcp 1.30s, cls 0; desktop performance 100.
- the root build is reproducible: `npm run build` generates `public/index.html` and `public/assets`; legacy, connect, faq, settings, catalog, icons, and fonts are left alone.
- no analytics, no third-party cdns; fonts are bundled locally.

### beta notes

- cookie mode still needs a server (worker or local). the static vercel deploy is guest/link only.
- links and tokens live in `localStorage`; cookie state stays on your server. don't paste real tokens or session cookies into issues.
- this is a beta. rough edges exist, and there has been no security audit. report them on [github issues](https://github.com/keroyokan-com/sso/issues) with steps and logs.
- self-host if you want the whole thing under your control.

thanks for trying it.

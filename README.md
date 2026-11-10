# sso by keroyokan

A small, private, self-hostable launcher for UNESA's SSO dashboard. Not an official UNESA service.

## What it does

- A clean service launcher with search and keyboard shortcuts.
- Category folders, favorites, and a compact folder overlay.
- Sections you can reorder or hide
- Light/dark, responsive, reduced-motion aware.
- Guest, link, and cookie modes.

## Three ways in

### Guest

Open the app and use the service roots. Useful when you only need one service and don't want to connect anything.

### Link (recommended, especially on mobile)

Open `sso.unesa.ac.id/dashboard`, copy **one** app link with **Copy link address**, and paste it into `/connect`.

The dashboard gives one short-lived token per render, and a fresh token works across services. The app uses the newest pasted link's token for every service; you do not need to copy one link per app.

When an app asks you to log in again, re-copy a fresh link. Old links mostly stop working; SIDIA is lenient, other apps are not. The link is stored only in your browser.

### Cookie (desktop / advanced)

The cookie mode sends the session cookie to a server that scrapes the dashboard and returns the service list. The local server or your own Worker handles it.

The hosted instance's cookie mode stores the cookie on that server only to read the dashboard; self-host if you want full control. The link mode never sends your token to the server.

## What is tested, and what is not

Local tests and observations:

- A freshly copied dashboard link opened SIDIA, MELISA, SIPENA, SIANI, and BEBASLAB.
- Older links mostly failed on non-SIDIA apps; SIDIA accepted them longer.
- The link token was accepted for at least 105 minutes in local testing; a 120-minute probe did not complete. Treat this as an observation, not a guarantee.
- The link was not bound to an IP in testing; do not treat it as safe to share.
- The UI has not had a security audit. The hosted instance is a convenience, not a guarantee.
- The app is not affiliated with UNESA, Google, or any service it links to.

## Privacy and storage

- Link and token: `localStorage` only, per browser.
- Name, theme, favorites, links, section order: `localStorage`.
- No analytics, no third-party fonts or CDNs.
- Cookie mode: optional, server-side, only to scrape the dashboard.
- Self-hosting is a first-class option, not a fallback.

## Self-host

### Local

```bash
npm install
npm start
```

`npm start` builds the client and starts the local server with Playwright/Chrome for the SSO session. The app is at <http://localhost:4173>. Local session data lives in `data/` and is gitignored.

### Cloudflare Workers

The deployed app is a Worker with static assets, Workers KV, and a cron trigger:

```bash
npm run deploy
```

See the Cloudflare deploy-button docs and use this repo as a template:

- <https://developers.cloudflare.com/workers/platform/deploy-buttons/>

### Vercel

Vercel fits the static SPA (guest and link modes; connect, settings, FAQ included). The cookie/scrape API needs the Worker or the local Node server, so the static deployment alone is link/guest only.

- <https://vercel.com/docs/deploy-button>

Real deploy buttons will be added once the Svelte SPA port is ready.

## Repository map

```text
public/            index, connect, settings, FAQ, catalog, icons, fonts, logo
src/app.js         client source; esbuild -> public/app.js
lib/sso.js         local Playwright session + dashboard scraper
worker/            Cloudflare Worker + scraper
server.js          local HTTP server
data/              local session cache, gitignored
wrangler.toml      Worker/KV/cron config
roadmap.md         Svelte SPA port, settings drawer, search quality, images
README.md          this file
```

## Roadmap

 See [`roadmap.md`](roadmap.md).

## FAQ

Short answers at [`/faq.html`](public/faq.html). 

## Contributing

Issues and PRs are welcome. Do not paste real SSO tokens, session cookies, or personal screenshots into an issue. `data/` is ignored for that reason.

## License

MIT. See [`LICENSE`](LICENSE).

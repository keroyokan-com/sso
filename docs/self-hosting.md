![sso](../public/sso-logo.svg)

# Self-hosting SSO Lite

SSO Lite is static files plus an optional small server. Guest and link modes need only the static app; cookie mode needs a server that can drive a browser.

## local setup

Requirements: Node 20.19+ and Google Chrome.

```bash
npm install
npm start
```

`npm start` builds the client and starts the local server at <http://localhost:4173>. Cookie mode uses Playwright with your installed Chrome. The server binds to `127.0.0.1`; set `PORT` to change the port.

Local session data lives in `data/` (gitignored):

- `data/state.json` - cached dashboard state
- `data/icons/` - fetched app icons
- `data/chrome-profile/` - the Playwright Chrome profile

## cloudflare workers

The deployed app is a Worker with static assets, Workers KV, and a cron trigger. `wrangler.toml` defines:

- `ASSETS` - `public/`
- `SSO_KV` - sessions, keys prefixed `s:`, 60-day TTL, deleted on logout
- cron `*/40 * * * *` - refreshes cached sessions

Deploy from your machine:

```bash
npm install
npx wrangler login
npm run deploy
```

Create the KV namespace first and put its id in `wrangler.toml` under `SSO_KV`. `npm run deploy` runs `npm run build` and then `wrangler deploy`.

### workers builds

Workers Builds can deploy from GitHub:

1. Connect the repo in the Cloudflare dashboard.
2. Build command: `npm run build`.
3. Deploy command: `npx wrangler deploy`.
4. Keep the `SSO_KV` binding and cron trigger in `wrangler.toml`, or set them in the dashboard.

`wrangler.preview.toml` is a preview config without cron, on `workers.dev`.

## vercel

Vercel hosts the static app only: guest and link modes, plus connect, settings, and FAQ. Cookie mode needs the Worker or the local Node server, so the scrape API is not available on a static deployment.

Use build command `npm run build` and output directory `public`.

## data and privacy

- Link and token: `localStorage` only, per browser.
- Name, theme, favorites, links, section order: `localStorage` (`sso.name`, `sso.theme`, `sso.favs`, `sso.links`, `sso.link`, `sso.sections`).
- Cookie mode: server-side only. Locally in `data/`; on Workers in `SSO_KV`.
- No analytics and no third-party CDNs. Fonts are bundled locally, including the Phosphor icon font.
- The hosted instance is a convenience, not a guarantee. Self-host for full control.

## session notes from testing

- A freshly copied dashboard link opened SIDIA, MELISA, SIPENA, SIANI, and BEBASLAB.
- Older links mostly failed on non-SIDIA apps; SIDIA accepted them longer.
- The link token was accepted for at least 105 minutes in local testing; a 120-minute probe did not complete. Treat this as an observation, not a guarantee.
- The link was not bound to an IP in testing; do not treat it as safe to share.
- The UI has not had a security audit.

## repository map

```text
app/               Svelte 5 SPA source, built to public/next/
public/            static app, legacy client, FAQ, catalog, icons, fonts, logo
src/app.js         legacy client source; esbuild -> public/app.js
lib/sso.js         local Playwright session + dashboard scraper
worker/            Cloudflare Worker + scraper
server.js          local HTTP server
data/              local session cache, gitignored
wrangler.toml      Worker, KV, and cron config
roadmap.md         Svelte SPA port and follow-ups
```

## contributing

Issues and PRs are welcome. Do not paste real SSO tokens, session cookies, or personal screenshots into an issue. `data/` is ignored for that reason.

## license

MIT. See [LICENSE](../LICENSE).

![sso](sso-logo.svg)

# Self-hosting SSO Lite

SSO Lite is static files plus an optional small server. The Svelte app is served at `/`, the vanilla app at `/legacy/`, and `/next/` redirects to `/`. Guest and link modes need only the static app; cookie mode needs a server that can drive a browser.

## local setup

Requirements: Node 20.19+ and Google Chrome.

```bash
npm install
npm start
```

`npm start` builds the client and starts the local server at <http://localhost:4173>. The Svelte app is at `/`, the vanilla app at `/legacy/`, and `/next/` redirects to `/`. Cookie mode uses Playwright with your installed Chrome. The server binds to `127.0.0.1`; set `PORT` to change the port.

Local session data lives in `data/` (gitignored):

- `data/state.json` - cached dashboard state
- `data/icons/` - fetched app icons
- `data/chrome-profile/` - the Playwright Chrome profile

## cloudflare workers

The deployed app is a Worker with static assets, Workers KV, and a cron trigger. Production is <https://sso.keroyokan.com>, also on <https://sso-lite.kwgtacc1.workers.dev>. `wrangler.toml` defines:

- `ASSETS` - `public/`, with the Svelte app at the root and the vanilla app at `/legacy/`
- `SSO_KV` - sessions, keys prefixed `s:`, 60-day TTL, deleted on logout
- cron `*/40 * * * *` - refreshes cached sessions

The Worker redirects `/next/` to `/` before handing requests to `ASSETS`.

Deploy from your machine:

```bash
npm ci
npx wrangler login
npm run deploy
```

Create the KV namespace first and put its id in `wrangler.toml` under `SSO_KV`. A fork needs its own namespace. `npm run deploy` runs `npm run build` and then `wrangler deploy`.

### workers builds

The repo is already connected to Workers Builds on the existing `sso-lite` Worker. A push to `main` builds and deploys production. The one-time account steps below are only needed for a new repo or a new Cloudflare account:

1. Install the Cloudflare GitHub App for the repo: Cloudflare dashboard > Workers & Pages > connect Git, then approve the repo. This needs account-owner consent in the browser.
2. Open the `sso-lite` Worker > Settings > Builds and connect `keroyokan-com/sso`.
3. Set the production branch to `main`.
4. Build command: `npm ci && npm run build`.
5. Deploy command: `npx wrangler deploy`.
6. Keep the `SSO_KV` binding and cron trigger in `wrangler.toml`.

Non-production branches build PR previews on the same `sso-lite` Worker, at `https://<branch>-sso-lite.kwgtacc1.workers.dev` (`/` in the branch name becomes `-`; for example `t3-readme-deploy-badges-sso-lite.kwgtacc1.workers.dev`). PR previews do not use a separate `sso-lite-preview` Worker. `wrangler.preview.toml` remains a manual preview config without cron; Workers Builds does not use it.

## vercel

Vercel hosts the static SPA only: guest and link modes, plus connect, settings, and FAQ. `/api/*` and `/go/*` stay on the Worker or the local Node server, and cookie mode is unavailable on a static deployment.

`vercel.json` sets the build:

- install command: `npm ci`
- build command: `npm run build`
- output directory: `public`

The `sso` project on Vercel is at <https://sso-kappa-eight.vercel.app>. It was deployed from the CLI. To deploy on every push, connect `keroyokan-com/sso` in the project settings; that needs the one-time Vercel GitHub App consent.

To deploy your own copy, use **Deploy with Vercel** in the README:

1. Sign in to Vercel and authorize the Vercel GitHub App on the first deploy. This one-time account consent cannot be completed by the CLI.
2. Name the project and deploy. Vercel creates a repo in your account and deploys on later pushes.
3. Keep the output directory at `public` if you set the project up by hand. Vercel's Vite preset expects `dist`, which this build does not use.

The Svelte app is generated at the root; the vanilla app stays at `/legacy/`.

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
app/               Svelte 5 SPA source, built to public/ (served at /)
public/            built Svelte app at the root, vanilla app at legacy/, FAQ, catalog, icons, fonts, logo
src/app.js         legacy client source; esbuild -> public/app.js
lib/sso.js         local Playwright session + dashboard scraper
worker/            Cloudflare Worker + scraper
server.js          local HTTP server
data/              local session cache, gitignored
wrangler.toml      Worker, KV, and cron config
vercel.json        static SPA build settings for Vercel
roadmap.md         Svelte SPA port and follow-ups
```

## contributing

Issues and PRs are welcome. Do not paste real SSO tokens, session cookies, or personal screenshots into an issue. `data/` is ignored for that reason.

## license

MIT. See [LICENSE](../LICENSE).

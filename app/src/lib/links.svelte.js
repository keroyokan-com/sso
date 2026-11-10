import { readJson } from './storage.js';

const LINKS_KEY = 'sso.links';

export const linksState = $state({
  active: false,
  email: '',
  updatedAt: 0,
});

function normalizeLinks(raw) {
  if (!raw || typeof raw !== 'object' || !raw.links || typeof raw.links !== 'object') {
    return null;
  }

  const links = {};
  let email = typeof raw.email === 'string' ? raw.email : '';
  let updatedAt = 0;

  for (const [host, entry] of Object.entries(raw.links)) {
    if (!entry || typeof entry.url !== 'string') continue;
    if (!/^[\w.-]+\.[\w.-]+$/.test(host)) continue;
    if (!/^https?:\/\//.test(entry.url)) continue;

    const at = Number(entry.at) || 0;
    links[host] = { ...entry, at };
    if (!email && typeof entry.email === 'string') email = entry.email;
    updatedAt = Math.max(updatedAt, at);
  }

  if (!Object.keys(links).length) return null;
  return { email, updatedAt };
}

export function refreshLinks() {
  const stored = normalizeLinks(readJson(LINKS_KEY, null));
  linksState.active = Boolean(stored);
  linksState.email = stored?.email || '';
  linksState.updatedAt = stored?.updatedAt || 0;
}

refreshLinks();

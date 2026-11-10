import { readJson } from './storage.js';

const LINKS_KEY = 'sso.links';
const LINK_KEY = 'sso.link';

export const linksState = $state({
  active: false,
  email: '',
  updatedAt: 0,
  links: {},
  newest: null,
});

function migrateLegacy(old) {
  if (!old || typeof old.email !== 'string') return null;
  if (!/^[A-Za-z0-9_-]{40,}$/.test(old.token || '')) return null;

  return {
    email: old.email,
    at: Number(old.at) || 0,
    links: {
      'sindig.unesa.ac.id': {
        url: `https://sindig.unesa.ac.id//${old.email}/${old.token}`,
        email: old.email,
        token: old.token,
        at: Number(old.at) || 0,
      },
    },
  };
}

export function readStoredLinks() {
  let raw = readJson(LINKS_KEY, null);

  if (!raw || typeof raw !== 'object' || !raw.links) {
    raw = migrateLegacy(readJson(LINK_KEY, null));
  }

  if (!raw || typeof raw !== 'object' || !raw.links) return null;

  const links = {};
  let email = typeof raw.email === 'string' ? raw.email : '';
  let updatedAt = 0;

  for (const [host, entry] of Object.entries(raw.links)) {
    if (!entry || typeof entry.url !== 'string') continue;
    if (!/^[\w.-]+\.[\w.-]+$/.test(host)) continue;
    if (!/^https?:\/\//.test(entry.url)) continue;

    const at = Number(entry.at) || 0;
    links[host] = {
      url: entry.url,
      email: entry.email || email,
      token: entry.token || '',
      at,
    };
    if (!email) email = entry.email || '';
    if (at > updatedAt) updatedAt = at;
  }

  if (!Object.keys(links).length) return null;

  let newest = null;
  for (const entry of Object.values(links)) {
    if (!newest || entry.at > newest.at) newest = entry;
  }

  return { email, at: updatedAt, links, newest };
}

export function refreshLinks() {
  const stored = readStoredLinks();
  linksState.active = Boolean(stored);
  linksState.email = stored?.email || '';
  linksState.updatedAt = stored?.at || 0;
  linksState.links = stored?.links || {};
  linksState.newest = stored?.newest || null;
  return stored;
}

refreshLinks();

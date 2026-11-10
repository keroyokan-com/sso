/**
 * Search-quality helpers for the SPA dashboard (roadmap phase 3).
 *
 * App shape: { title, desc, host, keywords? }, where keywords is an optional
 * array of extra search terms. This module is DOM-free so it can run under
 * `node --test` today and be imported by the Svelte components later.
 *
 * ALIASES maps a normalized query term to app ids/hosts. It is intentionally
 * small and explicit: it only covers vocabulary the catalog does not already
 * contain. `magang` points at MELISA because MELISA hosts Merdeka Belajar
 * Kampus Merdeka (MBKM) internships even though its title/desc do not say so.
 */

const SCORE = {
  titleExact: 1000,
  titlePrefix: 900,
  titleCompact: 850,
  titleCompactPrefix: 840,
  titleTokenPrefix: 800,
  alias: 750,
  fieldExact: 700,
  fieldPrefix: 690,
  fieldToken: 680,
  fieldIncludes: 660,
  fieldCompact: 650,
  fuzzy: 400,
};

const FUZZY_PENALTY = 20;
const MIN_FUZZY_TOKEN = 4;

/**
 * Lowercase, strip diacritics (NFD), turn punctuation/symbols into spaces,
 * and collapse whitespace.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Normalized text with all whitespace removed, for "me li sa" style matches.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function compact(value) {
  return normalize(value).replace(/\s+/g, '');
}

/**
 * Explicit keyword -> app id/host mapping. Keys must be normalized lowercase
 * terms (see `normalize`); values are app ids or hosts. Extend by adding one
 * entry, no ranking changes required.
 *
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const ALIASES = Object.freeze({
  magang: ['melisa.unesa.ac.id'],
  mbkm: ['melisa.unesa.ac.id'],
  email: ['mail.google.com'],
});

const ALIAS_INDEX = new Map(
  Object.entries(ALIASES).map(([key, targets]) => [
    normalize(key),
    targets.map((target) => normalize(target)),
  ]),
);

function tokens(text) {
  return text ? text.split(' ') : [];
}

function maxDistance(length) {
  return length >= 7 ? 2 : 1;
}

/**
 * Bounded optimal-string-alignment distance with an early exit. Returns
 * `max + 1` when the real distance exceeds `max`.
 *
 * @param {string} a
 * @param {string} b
 * @param {number} max
 * @returns {number}
 */
function boundedDistance(a, b, max) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  const width = b.length + 1;
  let prevPrev = null;
  let prev = new Array(width);
  let curr = new Array(width);

  for (let j = 0; j < width; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];

    for (let j = 1; j < width; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);

      if (
        prevPrev &&
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        value = Math.min(value, prevPrev[j - 2] + 1);
      }

      curr[j] = value;
      if (value < rowMin) rowMin = value;
    }

    if (rowMin > max) return max + 1;

    const recycled = prevPrev;
    prevPrev = prev;
    prev = curr;
    curr = recycled || new Array(width);
  }

  return prev[b.length];
}

function fuzzyScore(queryTokens, referenceTokens) {
  if (
    !queryTokens.length ||
    !referenceTokens.length ||
    queryTokens.some((token) => token.length < MIN_FUZZY_TOKEN)
  ) {
    return null;
  }

  let total = 0;

  for (const token of queryTokens) {
    const limit = maxDistance(token.length);
    let best = limit + 1;

    for (const reference of referenceTokens) {
      if (Math.abs(reference.length - token.length) > limit) continue;
      const distance = boundedDistance(token, reference, limit);
      if (distance < best) best = distance;
      if (best === 0) break;
    }

    if (best > limit) return null;
    total += best;
  }

  return Math.max(SCORE.fuzzy - total * FUZZY_PENALTY, 1);
}

function fieldScore(field, q, qCompact) {
  if (!field || !q) return null;

  const fieldTokens = tokens(field);
  const fieldCompact = field.replace(/\s+/g, '');

  if (field === q) return SCORE.fieldExact;
  if (field.startsWith(q)) return SCORE.fieldPrefix;
  if (fieldTokens.includes(q)) return SCORE.fieldToken;
  if (fieldTokens.some((token) => token.startsWith(q))) return SCORE.fieldToken;
  if (field.includes(q)) return SCORE.fieldIncludes;
  if (qCompact.length >= 3 && fieldCompact.includes(qCompact)) {
    return SCORE.fieldCompact;
  }

  return null;
}

/**
 * Score an app against a query. Returns a number (higher is better) or null
 * when nothing matches. An empty/whitespace query matches everything with 0.
 *
 * @param {{ title?: string, desc?: string, host?: string, keywords?: string[] } | null | undefined} app
 * @param {unknown} query
 * @returns {number | null}
 */
export function scoreApp(app, query) {
  if (!app) return null;

  const q = normalize(query);
  if (!q) return 0;

  const qTokens = tokens(q);
  const qCompact = q.replace(/\s+/g, '');
  const title = normalize(app.title);
  const titleTokens = tokens(title);
  const titleCompact = title.replace(/\s+/g, '');

  const keywords = Array.isArray(app.keywords)
    ? app.keywords.map((keyword) => normalize(keyword))
    : [];
  const host = normalize(app.host);
  const desc = normalize(app.desc);
  const fields = [host, desc, ...keywords].filter(Boolean);

  let best = null;
  const offer = (score) => {
    if (score !== null && (best === null || score > best)) best = score;
  };

  if (title) {
    if (title === q) offer(SCORE.titleExact);
    if (title.startsWith(q)) offer(SCORE.titlePrefix);
    if (qCompact.length >= 2 && titleCompact === qCompact) {
      offer(SCORE.titleCompact);
    }
    if (
      qCompact.length >= 3 &&
      titleCompact.startsWith(qCompact) &&
      titleCompact !== qCompact
    ) {
      offer(SCORE.titleCompactPrefix);
    }
    if (
      qTokens.every(
        (token) =>
          token.length >= 2 &&
          titleTokens.some((titleToken) => titleToken.startsWith(token)),
      )
    ) {
      offer(SCORE.titleTokenPrefix);
    }
  }

  for (const token of qTokens) {
    const targets = ALIAS_INDEX.get(token);
    if (!targets) continue;
    const identifiers = [normalize(app.id), host].filter(Boolean);
    if (identifiers.some((identifier) => targets.includes(identifier))) {
      offer(SCORE.alias);
      break;
    }
  }

  for (const field of fields) {
    offer(fieldScore(field, q, qCompact));
  }

  const referenceTokens = [...titleTokens, ...fields.flatMap(tokens)];
  offer(fuzzyScore(qTokens, referenceTokens));

  return best;
}

/**
 * Rank apps by relevance. A blank query returns a new array in input order.
 * Inputs are never mutated; non-matching apps are omitted.
 *
 * @template {{ title?: string, desc?: string, host?: string, keywords?: string[] }} T
 * @param {readonly T[]} apps
 * @param {unknown} query
 * @returns {T[]}
 */
export function searchApps(apps, query) {
  const q = normalize(query);
  if (!q) return apps.slice();

  const ranked = [];
  apps.forEach((app, index) => {
    const score = scoreApp(app, query);
    if (score !== null) ranked.push({ app, score, index });
  });

  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.map(({ app }) => app);
}

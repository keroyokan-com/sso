import { readText, writeText } from './storage.js';

const THEME_KEY = 'sso.theme';

export function currentTheme() {
  const stored = readText(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;

  const attr = document.documentElement.dataset.theme;
  if (attr === 'dark' || attr === 'light') return attr;

  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme, persist = false) {
  document.documentElement.dataset.theme = theme;
  if (persist) writeText(THEME_KEY, theme);
}

export function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next, true);
  return next;
}

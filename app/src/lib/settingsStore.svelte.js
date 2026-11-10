import { readJson, writeText } from './storage.js';

export const SECTION_KEY = 'sso.sections';
export const SECTION_EVENT = 'sso:sections';

export const SECTION_DEFS = [
  { id: 'folders', name: 'Kategori', desc: 'Folder kategori layanan' },
  { id: 'favorites', name: 'Favorit', desc: 'Layanan yang kamu bintangi' },
  { id: 'campus', name: 'Layanan kampus', desc: 'Daftar layanan dalam kategori' },
  { id: 'google', name: 'Google', desc: 'Gmail, Drive, Meet, Classroom' },
  { id: 'info', name: 'Info UNESA', desc: 'Kabar dan pengumuman' },
];

const DEFAULT_ORDER = SECTION_DEFS.map((def) => def.id);

function normalizeOrder(value) {
  const order = Array.isArray(value) ? value.filter((id) => DEFAULT_ORDER.includes(id)) : [];
  for (const id of DEFAULT_ORDER) {
    if (order.includes(id)) continue;
    const index = DEFAULT_ORDER.indexOf(id);
    order.splice(Math.min(index, order.length), 0, id);
  }
  return order;
}

function normalizeHidden(value) {
  return Array.isArray(value) ? value.filter((id) => DEFAULT_ORDER.includes(id)) : [];
}

export function read() {
  try {
    const raw = readJson(SECTION_KEY, null);
    if (!raw || typeof raw !== 'object') return { order: [...DEFAULT_ORDER], hidden: [] };
    return { order: normalizeOrder(raw.order), hidden: normalizeHidden(raw.hidden) };
  } catch {
    return { order: [...DEFAULT_ORDER], hidden: [] };
  }
}

const initial = read();

export const settingsState = $state({
  order: initial.order,
  hidden: initial.hidden,
  open: false,
});

export function settingsOpen() {
  return settingsState.open;
}

let triggerEl = null;

export function openSettings(trigger = null) {
  if (trigger && typeof trigger.focus === 'function') {
    triggerEl = trigger;
  } else if (typeof document !== 'undefined') {
    triggerEl = document.activeElement;
  }
  settingsState.open = true;
}

export function closeSettings() {
  settingsState.open = false;
}

export function focusSettingsTrigger() {
  const target = triggerEl;
  triggerEl = null;
  if (target && target.isConnected && typeof target.focus === 'function') target.focus();
}

/**
 * Persists `{ order, hidden }` to localStorage and dispatches `sso:sections`
 * on window with the same object as `event.detail`, so the dashboard can react
 * without polling localStorage.
 */
export function persist() {
  const detail = {
    order: [...settingsState.order],
    hidden: [...settingsState.hidden],
  };
  const saved = writeText(SECTION_KEY, JSON.stringify(detail));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SECTION_EVENT, { detail, bubbles: false }));
  }
  return saved;
}

export function reload() {
  const next = read();
  settingsState.order = next.order;
  settingsState.hidden = next.hidden;
}

export function setOrder(ids) {
  settingsState.order = normalizeOrder(ids);
  persist();
}

export function toggleHidden(id) {
  if (!DEFAULT_ORDER.includes(id)) return;

  const hidden = new Set(settingsState.hidden);
  if (hidden.has(id)) hidden.delete(id);
  else hidden.add(id);

  settingsState.hidden = settingsState.order.filter((entry) => hidden.has(entry));
  persist();
}

export function reset() {
  settingsState.order = [...DEFAULT_ORDER];
  settingsState.hidden = [];
  persist();
}

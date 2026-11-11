import { t, tn } from './i18n.svelte.js';

export function relativeTime(ts, now = Date.now()) {
  const diff = Math.max(0, now - Number(ts || 0));
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('time.justNow');
  if (min < 60) return tn('time.minutes', min);
  const hours = Math.floor(min / 60);
  if (hours < 24) return tn('time.hours', hours);
  const days = Math.floor(hours / 24);
  return tn('time.days', days);
}

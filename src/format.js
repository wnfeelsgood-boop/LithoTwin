// Number and coordinate formatting. Decimal separator follows the UI language.
import { getLang } from './i18n.js';

const locale = () => (getLang() === 'ru' ? 'ru-RU' : 'en-US');

export function num(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(locale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export const pct = (fraction, digits = 0) => (fraction == null ? '—' : `${num(fraction * 100, digits)}%`);

export function coords({ lat, lon }) {
  const ru = getLang() === 'ru';
  const ns = lat >= 0 ? (ru ? 'с. ш.' : 'N') : ru ? 'ю. ш.' : 'S';
  const ew = lon >= 0 ? (ru ? 'в. д.' : 'E') : ru ? 'з. д.' : 'W';
  return `${num(Math.abs(lat), 4)}° ${ns} · ${num(Math.abs(lon), 4)}° ${ew}`;
}

/** Escape text before putting it into an HTML template string. */
export function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

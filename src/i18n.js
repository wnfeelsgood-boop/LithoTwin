// Language state and text helpers. UI strings live here; data labels come from labels.json.

const STORAGE_KEY = 'lithotwin.lang';
const listeners = new Set();

function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'ru' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

let lang = readStoredLang() || 'en';

export const getLang = () => lang;

export function setLang(next) {
  if (next !== 'en' && next !== 'ru') return;
  lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage unavailable: keep the choice in memory only */
  }
  document.documentElement.lang = next;
  listeners.forEach((fn) => fn(next));
}

export const onLangChange = (fn) => listeners.add(fn);

/** Pick the text for the current language with fallback ru → en. Returns null if nothing. */
export function t(obj) {
  if (obj == null) return null;
  if (typeof obj === 'string') return obj;
  return obj[lang] ?? obj.ru ?? obj.en ?? null;
}

/** True when the shown text is a fallback from another language (used for the small "RU" tag). */
export function isFallback(obj) {
  if (obj == null || typeof obj === 'string') return false;
  return obj[lang] == null && (obj.ru != null || obj.en != null);
}

/** Label for a data code, e.g. label(labels, 'group', 'ru_candidate'). Never returns the raw code. */
export function label(labels, field, code) {
  const entry = labels?.[field]?.[String(code)];
  return entry ? t(entry) : '';
}

const UI = {
  subtitle: { en: 'Earth analogs for the Moon and Mars', ru: 'Земные аналоги Луны и Марса' },
  world: { en: 'World', ru: 'Весь мир' },
  russia: { en: 'Russia', ru: 'Россия' },
  method: { en: 'Method & data', ru: 'Метод и данные' },
  worldHeading: { en: 'Which place on Earth is most like your target?', ru: 'Какое место на Земле больше всего похоже на цель?' },
  pairLabel: { en: 'Target and task', ru: 'Цель и задача' },
  filterAll: { en: 'All', ru: 'Все' },
  filterNoRed: { en: 'No red', ru: 'Без красных' },
  filterGreen: { en: 'Green only', ru: 'Только зелёные' },
  filterHint: {
    en: 'Similarity ranks the list. Colour shows whether you can actually work there.',
    ru: 'Сходство задаёт порядок. Цвет показывает, можно ли там реально работать.',
  },
  emptyFilter: {
    en: "No sites pass this filter for this task. Try 'All'.",
    ru: 'Для этой задачи нет площадок под этот фильтр. Попробуйте «Все».',
  },
  similarity: { en: 'Similarity', ru: 'Сходство' },
  loading: { en: 'Loading data…', ru: 'Загружаем данные…' },
  loadError: { en: 'Could not load the data package.', ru: 'Не удалось загрузить данные.' },
  footer: {
    en: 'Data: Copernicus DEM GLO-90 (ESA), LRO LOLA, MGS MOLA (NASA PDS). Scores are a draft from 15 Nov 2026.',
    ru: 'Данные: Copernicus DEM GLO-90 (ESA), LRO LOLA, MGS MOLA (NASA PDS). Оценки: черновик от 15.11.2026.',
  },
};

export const ui = (key) => t(UI[key]) ?? key;
export const UI_STRINGS = UI;

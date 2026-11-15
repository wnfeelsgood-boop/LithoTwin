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
  openDossier: { en: 'Open dossier', ru: 'Открыть досье' },
  currentTarget: { en: 'Target', ru: 'Цель' },
  task: { en: 'Task', ru: 'Задача' },
  exposure_high: { en: 'High', ru: 'Высокая' },
  exposure_medium: { en: 'Medium', ru: 'Средняя' },
  exposure_low: { en: 'Low', ru: 'Низкая' },
  rankingTitle: { en: 'Analog ranking', ru: 'Рейтинг аналогов' },
  targetNumbers: { en: 'Target in numbers · 3 km circle', ru: 'Цель в цифрах · круг 3 км' },
  globeHint: {
    en: 'Drag the globe to see Russia, Antarctica and Hawaii. Click a pentagon to select a site, click again to open its dossier.',
    ru: 'Перетащите глобус, чтобы увидеть Россию, Антарктиду и Гавайи. Клик по пентагону выбирает площадку, повторный открывает досье.',
  },
  legend: { en: 'Size = similarity · Colour = suitability · Dashed = negative control', ru: 'Размер = сходство · Цвет = пригодность · Пунктир = негатив' },
  moon: { en: 'Moon', ru: 'Луна' },
  mars: { en: 'Mars', ru: 'Марс' },
  sitesShown: { en: 'sites shown', ru: 'площадок показано' },
  methodCheck: { en: 'Method check', ru: 'Проверка метода' },
  methodCheckText: {
    en: 'best negative control {neg} < analog median {med} · stable in {runs}/{total} weight perturbations',
    ru: 'лучший негатив {neg} < медиана аналогов {med} · устойчиво в {runs}/{total} прогонах со сдвигом весов',
  },
  methodCheckFail: {
    en: 'best negative control {neg} ≥ analog median {med}: the method does not separate this pair',
    ru: 'лучший негатив {neg} ≥ медиана аналогов {med}: метод не разделяет эту пару',
  },
  // Dossier
  backToRanking: { en: 'Ranking', ru: 'Рейтинг' },
  dossierStatus: { en: 'dossier: {status}', ru: 'досье: {status}' },
  status_draft: { en: 'draft', ru: 'черновик' },
  status_verified: { en: 'checked', ru: 'проверено' },
  status_corrected: { en: 'corrected', ru: 'исправлено' },
  novelty_published: { en: 'Published analog', ru: 'Описан как аналог' },
  novelty_related: { en: 'Related studies exist', ru: 'Есть близкие работы' },
  novelty_none: { en: 'New candidate', ru: 'Новый кандидат' },
  introMoon: { en: 'For a Moon base:', ru: 'Для лунной базы:' },
  introMars: { en: 'For Mars exploration:', ru: 'Для исследования Марса:' },
  similarityTo: { en: 'Similarity to {target} · task “{task}”', ru: 'Сходство с целью «{target}» · задача «{task}»' },
  of100: { en: 'of 100', ru: 'из 100' },
  rank: { en: 'Rank', ru: 'Место' },
  rankOf: { en: '{rank} of {total}', ru: '{rank} из {total}' },
  underShifts: { en: 'Under weight shifts', ru: 'При сдвиге весов' },
  coverage: { en: 'Data coverage', ru: 'Полнота данных' },
  stability_high: { en: 'stable', ru: 'устойчиво' },
  stability_medium: { en: 'fairly stable', ru: 'средне' },
  stability_low: { en: 'unstable', ru: 'неустойчиво' },
  and: { en: 'and', ru: 'и' },
  mapNote: {
    en: '10 × 10 km square, dashed circle = 3 km analysis area, scale bar 2 km.',
    ru: 'Квадрат 10 × 10 км, пунктир = круг анализа 3 км, линейка 2 км.',
  },
  marsPixels: { en: 'Mars looks blocky: MOLA resolution is about 463 m per pixel.', ru: 'Марс выглядит ступенчатым: разрешение MOLA около 463 м на пиксель.' },
  whatMakesUp: { en: 'What makes up {score}', ru: 'Из чего сложилось {score}' },
  barsNote: {
    en: 'Light part = what a feature could add, bright part = what it added. Parts are rounded, so the sum may differ by a few tenths.',
    ru: 'Светлая часть = сколько признак мог дать, яркая = сколько дал. Части округлены, сумма может отличаться на несколько десятых.',
  },
  numbersNext: { en: 'Numbers next to the target', ru: 'Цифры рядом с целью' },
  featureCol: { en: 'Feature, 3 km circle', ru: 'Признак, круг 3 км' },
  coversPart: { en: 'Relief data covers {pct} of the circle', ru: 'Рельеф посчитан по {pct} круга' },
  suitabilityRules: { en: 'Suitability by rules', ru: 'Пригодность по правилам' },
  whatItIs: { en: 'What it is', ru: 'Что это' },
  howSimilar: { en: 'How it is similar', ru: 'Чем похоже' },
  howDiffers: { en: 'How it differs', ru: 'Чем отличается' },
  goodFor: { en: 'What it is good for', ru: 'Для чего пригодно' },
  sources: { en: 'Sources', ru: 'Источники' },
  objectAtCentre: { en: 'At the centre of the circle', ru: 'В центре круга' },
  notFound: { en: 'Site not found.', ru: 'Площадка не найдена.' },
  rule_flat_reason: { en: 'Flat share {value} (suitable from {pass}, caveats from {warn})', ru: 'Доля ровных {value} (пригодно от {pass}, с оговорками от {warn})' },
  rule_slope_reason: { en: 'Slope P90 {value} (suitable up to {pass}, caveats up to {warn})', ru: 'Уклон P90 {value} (пригодно до {pass}, с оговорками до {warn})' },
  rule_drill_ice: { en: 'Ground ice: {ice}', ru: 'Лёд в грунте: {ice}' },
  rule_drill_rock: { en: 'Rock worth drilling: {rock}', ru: 'Порода для бурения: {rock}' },
  rule_drill_none: { en: 'No ground ice, rock is not a priority drilling target', ru: 'Нет льда в грунте, порода не приоритетна для бурения' },
  // Russia
  russiaHeading: { en: 'Where in Russia to rehearse the Moon and Mars', ru: 'Где в России репетировать Луну и Марс' },
  russiaSub: {
    en: '{n} sites from Dagestan to Chukotka. The number on the pentagon is the place in the world ranking out of {total}.',
    ru: '{n} площадок от Дагестана до Чукотки. Цифра на пентагоне = место в мировом рейтинге из {total}.',
  },
  russiaTop3: { en: 'Russia in world top-3: {n} of {total} tasks', ru: 'Россия в топ-3 мира: {n} из {total} задач' },
  bestRussian: { en: 'Best Russian candidate per task', ru: 'Лучший российский кандидат по задачам' },
  inWorld: { en: '#{rank} in the world', ru: '{rank} место в мире' },
  holdsBackTitle: { en: 'What holds Russian sites back', ru: 'Что мешает российским площадкам' },
  holdsBack: {
    en: 'Sites are unique but small: taiga around Batagaika and Uzon, steppe around Sarykum. Many get yellow or red for bare ground even when rock and ice match.',
    ru: 'Объекты уникальны, но малы: вокруг Батагайки и Узона тайга, у Сарыкума степь. Поэтому многие площадки получают жёлтый или красный по голому грунту, хотя по породе и льду похожи на цель.',
  },
  russiaLegend: { en: 'Size = similarity · Colour = suitability · Number = world rank', ru: 'Размер = сходство · Цвет = пригодность · Цифра = место в мире' },
  loading: { en: 'Loading data…', ru: 'Загружаем данные…' },
  loadError: { en: 'Could not load the data package.', ru: 'Не удалось загрузить данные.' },
  footer: {
    en: 'Data: Copernicus DEM GLO-90 (ESA), LRO LOLA, MGS MOLA (NASA PDS). Scores are a draft from 15 Nov 2026.',
    ru: 'Данные: Copernicus DEM GLO-90 (ESA), LRO LOLA, MGS MOLA (NASA PDS). Оценки: черновик от 15.11.2026.',
  },
};

export const ui = (key, vars) => {
  let text = t(UI[key]) ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, v);
  return text;
};
export const UI_STRINGS = UI;

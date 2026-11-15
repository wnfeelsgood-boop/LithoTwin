// Suitability filter: All / No red (default) / Green only. Applies to the list and the map alike.
import { ui } from '../i18n.js';
import { esc } from '../format.js';

const OPTIONS = [
  ['all', 'filterAll'],
  ['nored', 'filterNoRed'],
  ['green', 'filterGreen'],
];

export function passesFilter(score, filter) {
  if (filter === 'green') return score.suitability === 'pass';
  if (filter === 'nored') return score.suitability !== 'fail';
  return true;
}

export function filterBarHtml(active) {
  return `
    <div class="segmented segmented--full" role="radiogroup" aria-label="Suitability filter" title="${esc(ui('filterHint'))}">
      ${OPTIONS.map(
        ([value, key]) =>
          `<button type="button" role="radio" aria-checked="${value === active}"
            class="${value === active ? 'is-on' : ''}" data-filter="${value}">${esc(ui(key))}</button>`
      ).join('')}
    </div>`;
}

// "What makes up the score": one bar per contribution. Track = maximum possible, fill = actual points.
import { ui, label } from '../i18n.js';
import { num, esc } from '../format.js';
import { capitalize } from './featureTable.js';

export const CONTRIB_ORDER = [
  'material',
  'ice',
  'exposure',
  'slope_p50',
  'flat_frac',
  'slope_p90',
  'roughness_rms',
  'local_relief',
];

export function contribBarsHtml(data, score) {
  const keys = [...CONTRIB_ORDER, ...Object.keys(score.contrib).filter((k) => !CONTRIB_ORDER.includes(k))];
  const maxOf = (k) => data.contribMax(score.task, k, score.site_id);
  const maxAll = Math.max(...keys.map(maxOf), 1);
  return `
    <section class="contrib">
      <h2 class="section-title">${esc(ui('whatMakesUp', { score: num(score.similarity) }))}</h2>
      <div class="contrib__rows">
        ${keys
          .filter((k) => k in score.contrib)
          .map((k) => {
            const max = maxOf(k);
            const value = score.contrib[k];
            const trackPct = (max / maxAll) * 100;
            const fillPct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
            return `
            <div class="contrib__row">
              <span class="contrib__name">${esc(capitalize(label(data.labels, 'feature', k)))}</span>
              <span class="contrib__track" style="width:${trackPct}%"><i style="width:${fillPct}%"></i></span>
              <span class="contrib__num mono">${num(value)} / ${num(max, Number.isInteger(Math.round(max * 10) / 10) ? 0 : 1)}</span>
            </div>`;
          })
          .join('')}
      </div>
      <p class="note muted">${esc(ui('barsNote'))}</p>
    </section>`;
}

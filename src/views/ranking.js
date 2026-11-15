// Ranking panel (right column of the world screen) and the method-check box.
// Rows follow rank (= similarity order) and are coloured by suitability; the two are never merged.
import { t, ui, label } from '../i18n.js';
import { num, esc } from '../format.js';
import { pentagonSvg } from '../components/pentagon.js';
import { passesFilter, filterBarHtml } from '../components/filterBar.js';

const GROUP_CLASS = { control: 'badge--control', ru_candidate: 'badge--ru', negative: 'badge--neg', target: 'badge--target' };

export function groupBadge(labels, group) {
  return `<span class="badge ${GROUP_CLASS[group] || ''}">${esc(label(labels, 'group', group))}</span>`;
}

export function methodCheckHtml(data, pair) {
  const m = data.methodCheckFor(pair);
  if (!m) return '';
  const vars = { neg: num(m.best_negative), med: num(m.analog_median), runs: m.robust_runs, total: m.runs };
  return `
    <p class="method-check ${m.pass ? 'is-pass' : 'is-fail'}">
      <span class="method-check__icon" aria-hidden="true">${m.pass ? '✓' : '✗'}</span>
      <span><strong>${esc(ui('methodCheck'))}:</strong> ${esc(ui(m.pass ? 'methodCheckText' : 'methodCheckFail', vars))}</span>
    </p>`;
}

export function visibleScores(data, pair, filter) {
  return data.scoresFor(pair).filter((s) => passesFilter(s, filter));
}

function rowHtml(data, pair, sc, selectedId) {
  const site = data.siteById.get(sc.site_id);
  const negative = site.group === 'negative';
  const selected = sc.site_id === selectedId;
  return `
    <li class="rank-row${negative ? ' is-negative' : ''}${selected ? ' is-selected' : ''}" data-site="${esc(sc.site_id)}">
      <button type="button" class="rank-row__main" data-select="${esc(sc.site_id)}" aria-pressed="${selected}">
        <span class="rank-row__rank mono">${sc.rank}</span>
        ${pentagonSvg({ suitability: sc.suitability, negative, size: 18 })}
        <span class="rank-row__body">
          <span class="rank-row__top">
            <span class="rank-row__title">${esc(t(site.name))}</span>
            <span class="rank-row__score mono">${num(sc.similarity)}</span>
          </span>
          <span class="rank-row__bar" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, sc.similarity))}%"></i></span>
          <span class="rank-row__meta">${esc(label(data.labels, 'group', site.group))} ·
            <span class="suit-text suit-text--${sc.suitability}">${esc(label(data.labels, 'suitability', sc.suitability))}</span></span>
        </span>
      </button>
      ${
        selected
          ? `<a class="rank-row__open btn-open" href="#/site/${encodeURIComponent(sc.site_id)}?pair=${pair.index}">${esc(ui('openDossier'))} →</a>`
          : ''
      }
    </li>`;
}

export function rankingHtml(data, pair, filter, selectedId, { closable = false } = {}) {
  const all = data.scoresFor(pair);
  const rows = visibleScores(data, pair, filter);
  return `
    <section class="ranking" aria-label="${esc(ui('rankingTitle'))}">
      <header class="ranking__head">
        <h2 class="ranking__title">${esc(ui('rankingTitle'))}</h2>
        <span class="ranking__tools">
          <span class="muted mono">${rows.length} / ${all.length}</span>
          ${closable ? `<button type="button" class="ranking__close" data-hide-ranking title="${esc(ui('hideRanking'))}" aria-label="${esc(ui('hideRanking'))}">×</button>` : ''}
        </span>
      </header>
      <p class="click-hint"><span aria-hidden="true">👆</span> ${esc(ui('clickHint'))}</p>
      ${filterBarHtml(filter)}
      ${
        rows.length
          ? `<ol class="rank-list">${rows.map((sc) => rowHtml(data, pair, sc, selectedId)).join('')}</ol>`
          : `<p class="empty muted">${esc(ui('emptyFilter'))}</p>`
      }
    </section>`;
}

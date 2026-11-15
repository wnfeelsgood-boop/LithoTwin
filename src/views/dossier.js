// Dossier page #/site/<id> (design: design_dossier.png).
// Context = pair from the URL, or the pair where this site ranks best.
import { t, ui, label, isFallback, getLang } from '../i18n.js';
import { num, pct, coords, esc } from '../format.js';
import { asset } from '../data.js';
import { state } from '../state.js';
import { navigate } from '../router.js';
import { groupBadge } from './ranking.js';
import { pairLabel, bodyDot, shortTargetName } from '../components/pairPicker.js';
import { pentagonSvg } from '../components/pentagon.js';
import { contribBarsHtml } from '../components/contribBars.js';
import { rulesListHtml, worstRuleNames } from '../components/rulesList.js';
import { featureText, featureName, RELIEF_KEYS, capitalize } from '../components/featureTable.js';

const DEM_NAME = { earth: 'Copernicus DEM', moon: 'LRO LOLA', mars: 'MGS MOLA' };

/** Small grey "RU" tag when a text is shown in a fallback language. */
function langTag(obj) {
  if (!isFallback(obj)) return '';
  const shown = getLang() === 'en' ? 'RU' : 'EN';
  return ` <span class="lang-tag" title="Translation pending">${shown}</span>`;
}
const anyFallback = (list) => list.some((x) => isFallback(x));

function sourceItem(src) {
  const s = String(src).trim();
  const url = /https?:\/\/\S+/.exec(s)?.[0];
  if (!url) return `<li>${esc(s)}</li>`;
  const textBefore = s.replace(url, '').replace(/[\s:—–-]+$/, '').trim();
  const shortUrl = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  return `<li>${textBefore ? `${esc(textBefore)} · ` : ''}<a href="${esc(url)}" target="_blank" rel="noopener">${esc(shortUrl)}</a></li>`;
}

function textCard(kind, titleKey, items) {
  const list = items.filter((x) => t(x));
  if (!list.length) return '';
  const tag = anyFallback(list) ? langTag(list.find((x) => isFallback(x))) : '';
  const body =
    list.length === 1 && kind === 'what'
      ? `<p>${esc(t(list[0]))}</p>`
      : `<ul>${list.map((x) => `<li>${esc(t(x))}</li>`).join('')}</ul>`;
  return `
    <section class="text-card text-card--${kind} panel">
      <h3 class="text-card__title">${esc(ui(titleKey))}${tag}</h3>
      ${body}
    </section>`;
}

function headerHtml(data, site, pair) {
  const d = site.dossier || {};
  const intro = d.intro;
  const introPrefix = pair.task === 'moon_base' ? ui('introMoon') : ui('introMars');
  const status = d.status ? ui('dossierStatus', { status: ui(`status_${d.status}`) }) : '';
  const novelty = d.novelty ? ui(`novelty_${d.novelty}`) : '';
  return `
    <div class="dossier__head">
      <div class="dossier__tags">
        ${groupBadge(data.labels, site.group)}
        <span class="mono muted coords">${esc(coords(site.center))}</span>
        ${novelty && !novelty.startsWith('novelty_') ? `<span class="badge">${esc(novelty)}</span>` : ''}
        ${status && !status.includes('status_') ? `<span class="badge badge--draft">${esc(status)}</span>` : ''}
      </div>
      <h1 class="dossier__name">${esc(t(site.name))}</h1>
      ${
        t(intro)
          ? `<p class="dossier__intro">${site.kind === 'site' ? `<span class="accent-ice">${esc(introPrefix)}</span> ` : ''}${esc(
              t(intro)
            )}${langTag(intro)}</p>`
          : ''
      }
      ${
        site.object_at_center_ru
          ? `<p class="dossier__centre muted"><span class="step-label">${esc(ui('objectAtCentre'))}</span> ${esc(
              site.object_at_center_ru
            )}${getLang() === 'en' ? ' <span class="lang-tag">RU</span>' : ''}</p>`
          : ''
      }
    </div>`;
}

function scoreCardHtml(data, site, pair, score) {
  const target = data.siteById.get(pair.targetId);
  const total = data.scoresFor(pair).length;
  const [lo, hi] = score.rank_range || [score.rank, score.rank];
  const worst = worstRuleNames(data, score);
  return `
    <aside class="score-card panel">
      <div class="score-card__label">
        <span class="sphere sphere--${esc(target.body)} sphere--sm" aria-hidden="true"></span>
        ${esc(ui('similarityTo', { target: shortTargetName(target), task: label(data.labels, 'task', pair.task) }))}
      </div>
      <div class="score-card__value"><span class="big-num">${num(score.similarity)}</span><span class="muted">${esc(ui('of100'))}</span></div>
      <dl class="score-card__stats">
        <div><dt>${esc(ui('rank'))}</dt><dd class="mono">${esc(ui('rankOf', { rank: score.rank, total }))}</dd></div>
        <div><dt>${esc(ui('underShifts'))}</dt><dd class="mono">${lo === hi ? lo : `${lo}–${hi}`}</dd></div>
        <div><dt>${esc(ui('coverage'))}</dt><dd class="mono">${pct(score.completeness)}</dd></div>
      </dl>
      <div class="suit-pill suit-pill--${score.suitability}">
        ${pentagonSvg({ suitability: score.suitability, size: 20 })}
        <span><strong>${esc(label(data.labels, 'suitability', score.suitability))}</strong>${worst ? ` · ${esc(worst)}` : ''}</span>
      </div>
    </aside>`;
}

function mapTile(site, caption) {
  return `
    <figure class="map-tile">
      <img src="${asset(site.map)}" alt="${esc(caption)}" loading="lazy" width="600" height="600" />
      <figcaption>${esc(caption)}</figcaption>
    </figure>`;
}

function mapsHtml(data, site, target) {
  const tiles = [mapTile(site, `${t(site.name)} · ${DEM_NAME[site.body]}`)];
  if (target && target.id !== site.id) tiles.push(mapTile(target, `${shortTargetName(target)} · ${DEM_NAME[target.body]}`));
  const marsNote = [site, target].some((s) => s?.body === 'mars') ? ` ${ui('marsPixels')}` : '';
  return `
    <section class="maps">
      <div class="maps__tiles">${tiles.join('')}</div>
      <p class="note muted">${esc(ui('mapNote') + marsNote)}</p>
    </section>`;
}

function compareTableHtml(data, site, target) {
  const keys = [...RELIEF_KEYS, 'material', 'ice'];
  const showTarget = target && target.id !== site.id;
  const valid = data.featuresBySite.get(site.id)?.slope_p50?.valid_fraction;
  return `
    <section class="compare">
      <h2 class="section-title">${esc(ui('numbersNext'))}</h2>
      <div class="table-wrap panel">
        <table class="compare__table">
          <thead><tr>
            <th scope="col">${esc(ui('featureCol'))}</th>
            <th scope="col">${esc(shortTargetName(site))}</th>
            ${showTarget ? `<th scope="col">${esc(shortTargetName(target))}</th>` : ''}
          </tr></thead>
          <tbody>
            ${keys
              .map((k) => {
                const isText = k === 'material' || k === 'ice';
                return `<tr><th scope="row">${esc(capitalize(featureName(data, k)))}</th>
                  <td class="${isText ? '' : 'mono'}">${esc(featureText(data, site, k))}</td>
                  ${showTarget ? `<td class="${isText ? '' : 'mono'} accent">${esc(featureText(data, target, k))}</td>` : ''}</tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      ${valid != null && valid < 1 ? `<p class="note warn-text">${esc(ui('coversPart', { pct: pct(valid) }))}</p>` : ''}
    </section>`;
}

function pairChipsHtml(data, site, activePair) {
  if (site.kind !== 'site') return '';
  return `
    <div class="dossier__pairs" role="radiogroup" aria-label="${esc(ui('pairLabel'))}">
      ${data.pairs
        .map((p) => {
          const sc = data.scoreOf(site.id, p);
          const on = p.index === activePair.index;
          const target = data.siteById.get(p.targetId);
          return `<button type="button" class="chip${on ? ' is-on' : ''}" role="radio" aria-checked="${on}" data-pair="${p.index}">
            ${bodyDot(target.body)}${esc(pairLabel(data, p))}${sc ? ` <span class="mono muted">#${sc.rank}</span>` : ''}</button>`;
        })
        .join('')}
    </div>`;
}

export function renderDossier(root, data, route) {
  const site = data.siteById.get(route.siteId);
  if (!site) {
    root.innerHTML = `<main class="page"><p><a href="#/">← ${esc(ui('backToRanking'))}</a></p><p>${esc(ui('notFound'))}</p></main>`;
    return;
  }
  const pair =
    site.kind === 'target'
      ? data.pairs.find((p) => p.targetId === site.id && p.index === route.pair) || data.pairs.find((p) => p.targetId === site.id)
      : data.pairs.find((p) => p.index === route.pair) || state.bestPairFor(data, site.id);
  const target = data.siteById.get(pair.targetId);
  const score = site.kind === 'site' ? data.scoreOf(site.id, pair) : null;
  const d = site.dossier || {};
  const sources = [...new Set([...(d.sources || []), ...(site.class_sources || [])].map((s) => String(s).trim()).filter(Boolean))];

  const crumbs = `
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="#/?pair=${pair.index}${route.filter !== 'nored' ? `&f=${route.filter}` : ''}">← ${esc(ui('backToRanking'))}</a>
      <span>/</span><span class="muted">${esc(pairLabel(data, pair))}</span>
      <span>/</span><span>${esc(t(site.name))}</span>
    </nav>`;

  root.innerHTML = `
    <main class="page dossier">
      ${crumbs}
      ${pairChipsHtml(data, site, pair)}
      <div class="dossier__top">
        ${headerHtml(data, site, pair)}
        ${score ? scoreCardHtml(data, site, pair, score) : ''}
      </div>
      <div class="dossier__row">
        ${mapsHtml(data, site, site.kind === 'site' ? target : null)}
        ${score ? contribBarsHtml(data, score) : ''}
      </div>
      <div class="dossier__row">
        ${compareTableHtml(data, site, site.kind === 'site' ? target : null)}
        ${score ? rulesListHtml(data, site, score) : ''}
      </div>
      <div class="dossier__cards">
        ${textCard('what', 'whatItIs', [d.summary].filter(Boolean))}
        ${textCard('similar', 'howSimilar', d.similar || [])}
        ${textCard('differs', 'howDiffers', d.differs || [])}
        ${textCard('use', 'goodFor', d.use || [])}
      </div>
      ${
        sources.length
          ? `<section class="sources"><h2 class="section-title">${esc(ui('sources'))}</h2><ol>${sources.map(sourceItem).join('')}</ol></section>`
          : ''
      }
    </main>`;

  root.querySelectorAll('[data-pair]').forEach((b) =>
    b.addEventListener('click', () => navigate({ pair: Number(b.dataset.pair) }))
  );
}

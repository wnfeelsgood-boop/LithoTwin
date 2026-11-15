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
import { photoFigureHtml } from '../components/photos.js';
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

/** Geologists start the intro with the mission ("For Mars exploration: …"); show that lead-in in accent colour. */
function introHtml(text) {
  const m = /^([^:]{3,45}):\s*(.+)$/s.exec(text);
  if (!m) return esc(text);
  return `<span class="accent-ice">${esc(m[1])}:</span> ${esc(m[2])}`;
}

/** Where this site stands for each mission: the Moon base, and its best Mars task. The current mission is highlighted. */
function missionFitHtml(data, site, activePair) {
  if (site.kind !== 'site') return '';
  const bodyOf = (p) => data.siteById.get(p.targetId)?.body;
  const best = (body) => {
    let out = null;
    for (const p of data.pairs.filter((x) => bodyOf(x) === body)) {
      const sc = data.scoreOf(site.id, p);
      if (sc && (!out || sc.rank < out.sc.rank)) out = { p, sc };
    }
    return out;
  };
  const chip = (body) => {
    const b = best(body);
    if (!b) return '';
    const total = data.scoresFor(b.p).length;
    const on = bodyOf(activePair) === body;
    const where = body === 'mars' ? ` · ${ui('missionFitBest', { pair: pairLabel(data, b.p) })}` : '';
    return `<a class="mission-chip mission-chip--${body}${on ? ' is-on' : ''}" href="#/site/${encodeURIComponent(site.id)}?pair=${b.p.index}">
      <span class="sphere sphere--${body} sphere--xs" aria-hidden="true"></span>
      <span><strong>${esc(ui(`missionShort_${body}`))}</strong>
      <span class="mono">${esc(ui('missionFitRank', { rank: b.sc.rank, total }))}</span><span class="muted">${esc(where)}</span></span>
    </a>`;
  };
  return `
    <div class="mission-fit" aria-label="${esc(ui('missionFit'))}">
      <span class="step-label">${esc(ui('missionFit'))}</span>
      <div class="mission-fit__chips">${chip('moon')}${chip('mars')}</div>
    </div>`;
}

function headerHtml(data, site, pair) {
  const d = site.dossier || {};
  const intro = d.intro;
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
      ${missionFitHtml(data, site, pair)}
      ${
        t(intro) ? `<p class="dossier__intro">${introHtml(t(intro))}${langTag(intro)}</p>` : ''
      }
      ${
        // This field exists only in Russian, so it is shown in the RU interface only.
        site.object_at_center_ru && getLang() === 'ru'
          ? `<p class="dossier__centre muted"><span class="step-label">${esc(ui('objectAtCentre'))}</span> ${esc(
              site.object_at_center_ru
            )}</p>`
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

const lc = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const joinList = (items) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ${ui('and')} ${items[items.length - 1]}`;

/** Two-line verdict: what makes the site similar, what holds it back (points lost and suitability rules). */
function verdictHtml(data, score, target) {
  const rows = Object.entries(score.contrib).map(([k, v]) => ({ k, v, max: data.contribMax(score.task, k, score.site_id) }));
  const name = (k) => lc(label(data.labels, 'feature', k));
  const strong = rows.filter((r) => r.max > 0 && r.v / r.max >= 0.6).sort((a, b) => b.v - a.v).slice(0, 2);
  const weak = rows.filter((r) => r.max - r.v >= 2).sort((a, b) => b.max - b.v - (a.max - a.v)).slice(0, 2);
  const lines = [];
  if (strong.length) lines.push(ui('verdictSimilar', { target: shortTargetName(target), list: joinList(strong.map((r) => name(r.k))) }));
  if (weak.length) lines.push(ui('verdictHeld', { list: joinList(weak.map((r) => name(r.k))) }));
  const worst = worstRuleNames(data, score);
  if (worst) lines.push(ui('verdictRules', { list: worst }));
  if (!lines.length) return '';
  return `
    <section class="verdict panel">
      <span class="step-label">${esc(ui('verdict'))}</span>
      ${lines.map((l) => `<p>${esc(l)}</p>`).join('')}
    </section>`;
}

/** One table instead of two: feature, this site, the target, and the points the feature added (bar). */
function breakdownHtml(data, site, target, score) {
  const keys = Object.keys(score.contrib).sort(
    (a, b) => data.contribMax(score.task, b, site.id) - data.contribMax(score.task, a, site.id)
  );
  const losses = keys
    .map((k) => ({ k, loss: data.contribMax(score.task, k, site.id) - score.contrib[k] }))
    .filter((x) => x.loss >= 2)
    .sort((a, b) => b.loss - a.loss)
    .slice(0, 2)
    .map((x) => x.k);
  const valid = data.featuresBySite.get(site.id)?.slope_p50?.valid_fraction;
  return `
    <section class="breakdown">
      <h2 class="section-title">${esc(ui('breakdownTitle', { score: num(score.similarity) }))}</h2>
      <div class="table-wrap panel">
        <table class="compare__table breakdown__table">
          <thead><tr>
            <th scope="col">${esc(ui('featureCol'))}</th>
            <th scope="col">${esc(shortTargetName(site))}</th>
            <th scope="col">${esc(shortTargetName(target))}</th>
            <th scope="col">${esc(ui('pointsCol'))}</th>
          </tr></thead>
          <tbody>
            ${keys
              .map((k) => {
                const max = data.contribMax(score.task, k, site.id);
                const v = score.contrib[k];
                const isText = k === 'material' || k === 'ice' || k === 'exposure';
                const targetVal = k === 'exposure' ? '—' : featureText(data, target, k);
                return `<tr class="${losses.includes(k) ? 'is-loss' : ''}">
                  <th scope="row">${esc(capitalize(featureName(data, k)))}</th>
                  <td class="${isText ? '' : 'mono'}">${esc(featureText(data, site, k))}</td>
                  <td class="${isText ? '' : 'mono'} target-col">${esc(targetVal)}</td>
                  <td class="points"><span class="points__bar"><i style="width:${max > 0 ? Math.min(100, (v / max) * 100) : 0}%"></i></span>
                    <span class="mono points__num">${num(v)} / ${num(max, Number.isInteger(Math.round(max * 10) / 10) ? 0 : 1)}</span></td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      <p class="note muted">${esc(ui('breakdownNote'))}</p>
      ${valid != null && valid < 1 ? `<p class="note warn-text">${esc(ui('coversPart', { pct: pct(valid) }))}</p>` : ''}
    </section>`;
}

/** Images and relief maps in one block with a switch; the image (the most readable element) comes first. */
function imagesHtml(data, site, target) {
  const showTarget = target && target.id !== site.id;
  const ownPhotos = data.photosFor(site.id);
  const tgtPhotos = showTarget ? data.photosFor(target.id) : [];
  const hasImages = ownPhotos.length > 0 || tgtPhotos.length > 0;
  const imageView = `<div class="photos__grid">${[...ownPhotos.slice(0, 1), ...tgtPhotos.slice(0, 1)]
    .map((p) => photoFigureHtml(p))
    .join('')}</div>`;
  return `
    <section class="images">
      <div class="images__head">
        <h2 class="section-title">${esc(ui('imagesTitle'))}</h2>
        ${
          hasImages
            ? `<div class="segmented" role="tablist">
                <button type="button" role="tab" class="is-on" aria-selected="true" data-view="image">${esc(ui('viewImage'))}</button>
                <button type="button" role="tab" aria-selected="false" data-view="relief">${esc(ui('viewRelief'))}</button>
              </div>`
            : ''
        }
      </div>
      ${hasImages ? `<div data-pane="image">${imageView}</div>` : ''}
      <div data-pane="relief" ${hasImages ? 'hidden' : ''}>${mapsHtml(data, site, showTarget ? target : null)}</div>
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
      <button type="button" class="btn btn--small crumbs__copy" data-copy>${esc(ui('copyLink'))}</button>
    </nav>`;

  root.innerHTML = `
    <main class="page dossier">
      ${crumbs}
      ${pairChipsHtml(data, site, pair)}
      <div class="dossier__top">
        <div class="dossier__lead">
          ${headerHtml(data, site, pair)}
          ${score ? verdictHtml(data, score, target) : ''}
        </div>
        ${score ? scoreCardHtml(data, site, pair, score) : ''}
      </div>
      <div class="dossier__cards">
        ${textCard('similar', 'howSimilar', d.similar || [])}
        ${textCard('differs', 'howDiffers', d.differs || [])}
        ${textCard('use', 'goodFor', d.use || [])}
        ${textCard('what', 'whatItIs', [d.summary].filter(Boolean))}
      </div>
      <div class="dossier__row">
        ${imagesHtml(data, site, site.kind === 'site' ? target : null)}
        ${score ? rulesListHtml(data, site, score) : compareTableHtml(data, site, null)}
      </div>
      ${score ? breakdownHtml(data, site, target, score) : ''}
      ${
        sources.length
          ? `<section class="sources"><h2 class="section-title">${esc(ui('sources'))}</h2><ol>${sources.map(sourceItem).join('')}</ol></section>`
          : ''
      }
    </main>`;

  root.querySelectorAll('[data-pair]').forEach((b) =>
    b.addEventListener('click', () => navigate({ pair: Number(b.dataset.pair) }))
  );
  root.querySelectorAll('[data-view]').forEach((b) =>
    b.addEventListener('click', () => {
      root.querySelectorAll('[data-view]').forEach((x) => {
        const on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-selected', String(on));
      });
      root.querySelectorAll('[data-pane]').forEach((pane) => {
        pane.hidden = pane.dataset.pane !== b.dataset.view;
      });
    })
  );
  const copyBtn = root.querySelector('[data-copy]');
  copyBtn?.addEventListener('click', async () => {
    const done = () => {
      copyBtn.textContent = `✓ ${ui('copied')}`;
      setTimeout(() => (copyBtn.textContent = ui('copyLink')), 1800);
    };
    try {
      await navigator.clipboard.writeText(location.href);
      done();
    } catch {
      const input = document.createElement('input');
      input.value = location.href;
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand('copy');
        done();
      } catch {
        /* the URL stays in the address bar */
      }
      input.remove();
    }
  });
}

// Russia screen #/russia (design: design_russia.png).
// Flat map of Russia with the Russian candidates; numbers on pentagons are world ranks.
import { geoConicEqualArea, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import { t, ui, label } from '../i18n.js';
import { num, esc } from '../format.js';
import { asset } from '../data.js';
import { state } from '../state.js';
import { navigate } from '../router.js';
import { pairPickerHtml, pairLabel, bodyDot } from '../components/pairPicker.js';
import { pentagonSvg, markerSize } from '../components/pentagon.js';

const RUSSIA_ID = '643'; // ISO 3166-1 numeric, as used by world-atlas
const W = 960;
const H = 560;
let countriesCache = null;

async function loadCountries() {
  if (countriesCache) return countriesCache;
  const res = await fetch(asset('geo/countries-50m.json'));
  const topo = await res.json();
  countriesCache = feature(topo, topo.objects.countries).features;
  return countriesCache;
}

function russianSites(data) {
  return data.sites.filter((s) => s.kind === 'site' && s.group === 'ru_candidate');
}

function bestRussianPerPair(data) {
  return data.pairs.map((p) => {
    const best = data.scoresFor(p).find((sc) => data.siteById.get(sc.site_id)?.group === 'ru_candidate');
    return { pair: p, score: best };
  });
}

function sidebarHtml(data, activePair) {
  const items = bestRussianPerPair(data);
  return `
    <aside class="russia__side">
      <h2 class="section-title">${esc(ui('bestRussian'))}</h2>
      <ul class="best-list">
        ${items
          .filter((x) => x.score)
          .map(({ pair, score }) => {
            const site = data.siteById.get(score.site_id);
            const target = data.siteById.get(pair.targetId);
            const on = pair.index === activePair.index;
            return `
            <li>
              <a class="best-card panel${on ? ' is-on' : ''}" href="#/site/${encodeURIComponent(site.id)}?pair=${pair.index}">
                <span class="best-card__pair">${bodyDot(target.body)}${esc(pairLabel(data, pair))}</span>
                <span class="best-card__name">${esc(t(site.name))}</span>
                <span class="best-card__suit suit-text--${score.suitability}">${esc(label(data.labels, 'suitability', score.suitability))}</span>
                <span class="best-card__score mono">${num(score.similarity)}</span>
                <span class="best-card__rank">${esc(ui('inWorld', { rank: score.rank }))}</span>
              </a>
            </li>`;
          })
          .join('')}
      </ul>
      <section class="note-card panel">
        <h3 class="text-card__title muted">${esc(ui('holdsBackTitle'))}</h3>
        <p>${esc(ui('holdsBack'))}</p>
      </section>
    </aside>`;
}

/** Label placement: right, left, below or above the marker, whichever does not overlap a placed label. */
function placeLabels(points) {
  const placed = [];
  const fits = (b) => b.x0 >= 2 && b.x1 <= W - 2 && !placed.some((p) => b.x0 < p.x1 && b.x1 > p.x0 && b.y0 < p.y1 && b.y1 > p.y0);
  return points.map((pt) => {
    const w = pt.label.length * 7.6 + 6;
    const gap = pt.r + 6;
    const options = [
      { anchor: 'start', x: pt.x + gap, y: pt.y + 5, box: { x0: pt.x + gap, x1: pt.x + gap + w, y0: pt.y - 9, y1: pt.y + 9 } },
      { anchor: 'end', x: pt.x - gap, y: pt.y + 5, box: { x0: pt.x - gap - w, x1: pt.x - gap, y0: pt.y - 9, y1: pt.y + 9 } },
      { anchor: 'middle', x: pt.x, y: pt.y + gap + 12, box: { x0: pt.x - w / 2, x1: pt.x + w / 2, y0: pt.y + gap, y1: pt.y + gap + 18 } },
      { anchor: 'middle', x: pt.x, y: pt.y - gap - 4, box: { x0: pt.x - w / 2, x1: pt.x + w / 2, y0: pt.y - gap - 18, y1: pt.y - gap } },
    ];
    const choice = options.find((o) => fits(o.box)) || options[2];
    placed.push(choice.box);
    return choice;
  });
}

/** "Batagaika crater (Yakutia, Russia)" → "Batagaika crater": the map already shows where it is. */
const mapLabel = (site) => (t(site.name) || '').replace(/\s*\(.*\)\s*$/, '');

async function drawMap(el, data, pair) {
  const countries = await loadCountries();
  const russia = countries.find((c) => String(c.id) === RUSSIA_ID);
  const projection = geoConicEqualArea().rotate([-100, 0]).parallels([50, 70]);
  projection.fitExtent(
    [
      [16, 16],
      [W - 16, H - 16],
    ],
    russia
  );
  const path = geoPath(projection);

  const scores = data.scoresFor(pair);
  const points = russianSites(data)
    .map((site) => {
      const sc = scores.find((s) => s.site_id === site.id);
      const [x, y] = projection([site.center.lon, site.center.lat]);
      return { site, sc, x, y, r: (markerSize(sc?.similarity ?? 0) * 1.35) / 2, label: mapLabel(site) };
    })
    .filter((p) => p.sc);
  // Place labels for the biggest markers first so they get the best spots.
  const bySize = [...points].sort((a, b) => b.r - a.r);
  const labelFor = new Map(placeLabels(bySize).map((l, i) => [bySize[i].site.id, l]));

  const others = countries.filter((c) => c !== russia);
  el.innerHTML = `
    <svg class="russia-map" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ui('russiaHeading'))}">
      <path class="rm-graticule" d="${path(geoGraticule10())}"></path>
      <g class="rm-others">${others.map((c) => `<path d="${path(c) || ''}"></path>`).join('')}</g>
      <path class="rm-russia" d="${path(russia)}"></path>
      <g class="rm-markers">
        ${bySize
          .map((p) => {
            const size = p.r * 2;
            const l = labelFor.get(p.site.id);
            return `
            <g class="rm-marker" data-site="${esc(p.site.id)}" tabindex="0" role="link"
               aria-label="${esc(`${p.label}: ${num(p.sc.similarity)}, #${p.sc.rank}`)}">
              <g transform="translate(${p.x - size / 2} ${p.y - size / 2})">
                ${pentagonSvg({ suitability: p.sc.suitability, rank: p.sc.rank, size })}
              </g>
              <text class="rm-label" x="${l.x}" y="${l.y}" text-anchor="${l.anchor}">${esc(p.label)}</text>
            </g>`;
          })
          .join('')}
      </g>
    </svg>
    <p class="legend mono russia__legend">${esc(ui('russiaLegend'))}</p>`;

  el.querySelectorAll('.rm-marker').forEach((g) => {
    const open = () => navigate({ view: 'site', siteId: g.dataset.site, pair: pair.index });
    g.addEventListener('click', open);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });
}

export function renderRussia(root, data, route) {
  const pair = state.pair(data, route);
  const n = russianSites(data).length;
  const total = data.scoresFor(pair).length;
  const top3 = bestRussianPerPair(data).filter((x) => x.score && x.score.rank <= 3).length;

  root.innerHTML = `
    <main class="page russia">
      <div class="russia__main">
        <div class="russia__head">
          <div>
            <h1 class="page-title">${esc(ui('russiaHeading'))}</h1>
            <p class="muted">${esc(ui('russiaSub', { n, total }))}</p>
          </div>
          <span class="badge badge--top3 mono">${esc(ui('russiaTop3', { n: top3, total: data.pairs.length }))}</span>
        </div>
        ${pairPickerHtml(data, pair.index)}
        <div class="russia__map panel" id="russia-map"></div>
      </div>
      ${sidebarHtml(data, pair)}
    </main>`;

  root.querySelectorAll('[data-pair]').forEach((b) =>
    b.addEventListener('click', () => navigate({ pair: Number(b.dataset.pair) }))
  );
  drawMap(root.querySelector('#russia-map'), data, pair).catch((err) => {
    console.error(err);
    root.querySelector('#russia-map').innerHTML = `<p class="empty muted">${esc(ui('loadError'))}</p>`;
  });
}

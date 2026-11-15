// World screen (design: design_globe.png): left = target + task + target numbers + method check,
// centre = 3D globe, right = ranking. The ranking never depends on the globe.
import { ui } from '../i18n.js';
import { esc } from '../format.js';
import { targetTaskPickerHtml, pairForTarget } from '../components/pairPicker.js';
import { targetNumbersHtml } from '../components/featureTable.js';
import { rankingHtml, methodCheckHtml, visibleScores } from './ranking.js';
import { navigate } from '../router.js';
import { state } from '../state.js';

let globeModule = null; // loaded lazily so the ranking renders first

export function renderWorld(root, data, route) {
  const pair = state.pair(data, route);
  const target = data.siteById.get(pair.targetId);
  if (state.selectedId && !data.scoreOf(state.selectedId, pair)) state.selectedId = null;

  root.innerHTML = `
    <main class="world${state.globeFailed ? ' no-globe' : ''}">
      <aside class="world__left">
        ${targetTaskPickerHtml(data, pair)}
        ${targetNumbersHtml(data, target)}
        ${methodCheckHtml(data, pair)}
      </aside>
      <section class="world__centre" ${state.globeFailed ? 'hidden' : ''}>
        <h1 class="visually-hidden">${esc(ui('worldHeading'))}</h1>
        <div class="globe" id="globe-mount" aria-label="Globe"></div>
        <p class="legend mono">${esc(ui('legend'))}</p>
        <p class="globe-hint muted">${esc(ui('globeHint'))}</p>
      </section>
      <aside class="world__right" id="ranking-mount">
        ${rankingHtml(data, pair, route.filter, state.selectedId)}
      </aside>
    </main>`;

  bindControls(root, data, route, pair);
  mountGlobe(root, data, route, pair);
}

function bindControls(root, data, route, pair) {
  root.querySelectorAll('[data-target]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const next = pairForTarget(data, btn.dataset.target, pair.task);
      if (next) navigate({ pair: next.index });
    })
  );
  root.querySelectorAll('[data-pair]').forEach((btn) =>
    btn.addEventListener('click', () => navigate({ pair: Number(btn.dataset.pair) }))
  );

  const right = root.querySelector('#ranking-mount');
  right.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filter]');
    if (f) return navigate({ filter: f.dataset.filter });
    const btn = e.target.closest('[data-select]');
    if (btn) selectSite(root, data, route, btn.dataset.select, { fromList: true });
  });
  right.addEventListener('keydown', (e) => {
    const btn = e.target.closest('[data-select]');
    if (btn && e.key === 'Enter') {
      e.preventDefault();
      navigate({ view: 'site', siteId: btn.dataset.select, pair: pair.index });
    }
  });
}

/** Select a site from the list or the globe. Activating the selected row again opens its dossier. */
export function selectSite(root, data, route, siteId, { fromList = false } = {}) {
  const pair = state.pair(data, route);
  if (fromList && state.selectedId === siteId) {
    navigate({ view: 'site', siteId, pair: pair.index });
    return;
  }
  state.selectedId = siteId;
  const mount = root.querySelector('#ranking-mount');
  if (mount) {
    const scrollList = mount.querySelector('.rank-list');
    const keep = scrollList ? scrollList.scrollTop : 0;
    mount.innerHTML = rankingHtml(data, pair, route.filter, siteId);
    const list = mount.querySelector('.rank-list');
    if (list) list.scrollTop = keep;
    const row = mount.querySelector(`[data-site="${CSS.escape(siteId)}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (fromList) row?.querySelector('[data-select]')?.focus({ preventScroll: true });
  }
  globeModule?.focusSite?.(siteId);
}

async function mountGlobe(root, data, route, pair) {
  const el = root.querySelector('#globe-mount');
  if (!el || state.globeFailed) return;
  try {
    globeModule = await import('./globe.js');
    await globeModule.renderGlobe(el, data, {
      pair,
      scores: visibleScores(data, pair, route.filter),
      selectedId: state.selectedId,
      onSelect: (id) => {
        if (state.selectedId === id) navigate({ view: 'site', siteId: id, pair: pair.index });
        else selectSite(root, data, route, id);
      },
    });
  } catch (err) {
    console.warn('Globe unavailable, showing the ranking only.', err);
    state.globeFailed = true;
    root.querySelector('.world__centre')?.setAttribute('hidden', '');
    root.querySelector('.world')?.classList.add('no-globe');
  }
}

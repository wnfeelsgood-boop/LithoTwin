// World screen (design: design_globe.png): left = target + task + target numbers + method check,
// centre = 3D globe, right = ranking. The ranking never depends on the globe.
import { ui, label } from '../i18n.js';
import { esc } from '../format.js';
import { targetTaskPickerHtml, pairForTarget, shortTargetName } from '../components/pairPicker.js';
import { targetNumbersHtml } from '../components/featureTable.js';
import { photoFigureHtml } from '../components/photos.js';
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
        <section class="target-globe panel" id="target-globe-panel">
          <div class="target-globe__canvas" id="target-globe"></div>
          <p class="target-globe__label muted">${esc(ui('targetGlobeHint', { body: ui(target.body) }))}</p>
        </section>
        ${data.photosFor(target.id).slice(0, 1).map((p) => photoFigureHtml(p, { compact: true })).join('')}
        ${targetNumbersHtml(data, target)}
        ${data.methodCheckFor(pair)?.pass ? `<a class="method-badge" href="#/about"><span aria-hidden="true">✓</span> ${esc(ui('methodChecked'))} →</a>` : methodCheckHtml(data, pair)}
      </aside>
      <section class="world__centre" ${state.globeFailed ? 'hidden' : ''}>
        <h1 class="mission-banner mission-banner--${esc(target.body)}">
          <span class="sphere sphere--${esc(target.body)} sphere--sm" aria-hidden="true"></span>
          <span><span class="mission-banner__goal">${esc(ui(`mission_${target.body}`))}</span>
          <span class="mission-banner__where">${esc(ui('missionWhere', { task: label(data.labels, 'task', pair.task), target: shortTargetName(target) }))}</span></span>
        </h1>
        <div class="globe" id="globe-mount" aria-label="Globe"></div>
        <p class="legend mono">${esc(ui('legend'))}</p>
        <p class="globe-hint muted">${esc(ui('globeHint'))}</p>
      </section>
      <aside class="world__right" id="ranking-mount">
        ${rankingHtml(data, pair, route.filter, state.selectedId, { hideHint: state.hintHidden })}
      </aside>
    </main>`;

  bindControls(root, data, route, pair);
  mountGlobe(root, data, route, pair);
  mountTargetGlobe(root, target);
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
    const toggle = e.target.closest('[data-hint-toggle]');
    if (toggle) {
      const collapsed = !state.hintHidden;
      state.setHintHidden(collapsed);
      toggle.closest('.click-hint')?.classList.toggle('is-collapsed', collapsed);
      toggle.setAttribute('aria-expanded', String(!collapsed));
      const tip = ui(collapsed ? 'showHint' : 'hideHint');
      toggle.title = tip;
      toggle.setAttribute('aria-label', tip);
      toggle.textContent = collapsed ? `👆 ${ui('hintLabel')}` : '×';
      return;
    }
    const f = e.target.closest('[data-filter]');
    if (f) return navigate({ filter: f.dataset.filter });
    const btn = e.target.closest('[data-select]');
    if (btn) selectSite(root, data, route, btn.dataset.select, { fromList: true });
  });
  right.addEventListener('dblclick', (e) => {
    const btn = e.target.closest('[data-select]');
    if (btn) navigate({ view: 'site', siteId: btn.dataset.select, pair: pair.index });
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
  // Update the rows in place (no re-render), so a double-click lands on the same element.
  const mount = root.querySelector('#ranking-mount');
  if (mount) {
    mount.querySelectorAll('.rank-row').forEach((li) => {
      const on = li.dataset.site === siteId;
      li.classList.toggle('is-selected', on);
      li.querySelector('[data-select]')?.setAttribute('aria-pressed', String(on));
      li.querySelector('.rank-row__open')?.remove();
      if (on) {
        const a = document.createElement('a');
        a.className = 'rank-row__open btn-open';
        a.href = `#/site/${encodeURIComponent(siteId)}?pair=${pair.index}`;
        a.textContent = `${ui('openDossier')} →`;
        li.appendChild(a);
      }
    });
    // Scroll only when the selection came from the globe: scrolling under the pointer would break double-click.
    if (!fromList) mount.querySelector(`[data-site="${CSS.escape(siteId)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  globeModule?.focusSite?.(siteId);
}

async function mountTargetGlobe(root, target) {
  const el = root.querySelector('#target-globe');
  if (!el) return;
  try {
    const mod = await import('./targetGlobe.js');
    await mod.renderTargetGlobe(el, target);
  } catch (err) {
    console.warn('Target globe unavailable.', err);
    root.querySelector('#target-globe-panel')?.setAttribute('hidden', '');
  }
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
      onOpen: (id) => navigate({ view: 'site', siteId: id, pair: pair.index }),
    });
  } catch (err) {
    console.warn('Globe unavailable, showing the ranking only.', err);
    state.globeFailed = true;
    root.querySelector('.world__centre')?.setAttribute('hidden', '');
    root.querySelector('.world')?.classList.add('no-globe');
  }
}

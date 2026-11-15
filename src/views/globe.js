// 3D Earth globe (globe.gl) with one pentagon per site.
// One globe instance lives for the whole session: re-rendering a screen re-attaches it,
// so changing pair or filter does not create a new WebGL context.
import Globe from 'globe.gl';
import { feature } from 'topojson-client';
import { t, ui, label } from '../i18n.js';
import { num, esc } from '../format.js';
import { asset } from '../data.js';
import { pentagonSvg, markerSize } from '../components/pentagon.js';

let globe = null;
let host = null; // element the globe draws into; moved between mounts
let resizeObs = null;
let countries = null;
let markerEls = new Map();
let currentSelect = () => {};
let currentOpen = () => {};
let currentData = null;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function loadCountries() {
  if (countries) return countries;
  const res = await fetch(asset('geo/countries-110m.json'));
  const topo = await res.json();
  countries = feature(topo, topo.objects.countries).features;
  return countries;
}

function createGlobe() {
  host = document.createElement('div');
  host.className = 'globe__host';
  globe = Globe({ animateIn: true })(host)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereColor('#5CC8FF')
    .atmosphereAltitude(0.16)
    .showGraticules(true)
    .polygonCapColor(() => '#3b4d6a')
    .polygonSideColor(() => 'rgba(0,0,0,0)')
    .polygonStrokeColor(() => 'rgba(183, 194, 211, 0.35)')
    .polygonAltitude(0.004)
    .htmlLat((d) => d.lat)
    .htmlLng((d) => d.lng)
    .htmlAltitude(0.012)
    .htmlTransitionDuration(0)
    .htmlElement((d) => d.el)
    .htmlElementVisibilityModifier((el, visible) => {
      el.style.opacity = visible ? '1' : '0';
      el.style.pointerEvents = visible ? 'auto' : 'none';
    });

  const mat = globe.globeMaterial();
  mat.color.set('#0c1420');
  if (mat.emissive) mat.emissive.set('#050a12');
  if ('shininess' in mat) mat.shininess = 4;

  const controls = globe.controls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
  });
  globe.pointOfView({ lat: 35, lng: 20, altitude: 1.9 });
}

function fitToHost(mount) {
  const { width, height } = mount.getBoundingClientRect();
  if (width > 0 && height > 0) globe.width(width).height(height);
}

function markerElement(data, sc, selected) {
  const site = data.siteById.get(sc.site_id);
  const negative = site.group === 'negative';
  const size = markerSize(sc.similarity);
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `marker${selected ? ' is-selected' : ''}${negative ? ' is-negative' : ''}`;
  el.setAttribute('aria-label', `${t(site.name)}: ${num(sc.similarity)}`);
  el.innerHTML = `
    ${pentagonSvg({ suitability: sc.suitability, rank: sc.rank, negative, size })}
    <span class="marker__tip" role="tooltip">
      <strong>${esc(t(site.name))}</strong>
      <span class="mono">${num(sc.similarity)}</span> ·
      <span class="suit-text--${sc.suitability}">${esc(label(data.labels, 'suitability', sc.suitability))}</span>
      <em class="marker__hint marker__hint--select">${esc(ui('tipSelect'))}</em>
      <em class="marker__hint marker__hint--open">${esc(ui('tipOpen'))}</em>
    </span>`;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    currentSelect(sc.site_id);
  });
  el.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    currentOpen(sc.site_id);
  });
  return el;
}

/**
 * Draw the globe into `mount`.
 * opts: { scores (already filtered), selectedId, onSelect(id) }
 */
export async function renderGlobe(mount, data, { scores, selectedId, onSelect, onOpen = () => {} }) {
  if (!webglAvailable()) throw new Error('WebGL is not available');
  currentData = data;
  currentSelect = onSelect;
  currentOpen = onOpen;
  if (!globe) createGlobe();
  mount.appendChild(host);
  fitToHost(mount);
  resizeObs?.disconnect();
  resizeObs = new ResizeObserver(() => fitToHost(mount));
  resizeObs.observe(mount);

  if (!globe.polygonsData().length) globe.polygonsData(await loadCountries());

  markerEls = new Map();
  const points = scores.map((sc) => {
    const site = data.siteById.get(sc.site_id);
    const el = markerElement(data, sc, sc.site_id === selectedId);
    markerEls.set(sc.site_id, el);
    return { id: sc.site_id, lat: site.center.lat, lng: site.center.lon, el, similarity: sc.similarity };
  });
  // Draw small markers last so big (more similar) ones do not hide them.
  points.sort((a, b) => b.similarity - a.similarity);
  globe.htmlElementsData(points);

  if (selectedId) focusSite(selectedId, 0);
}

/** Rotate the globe to a site and highlight its marker. */
export function focusSite(siteId, ms = 900) {
  if (!globe || !currentData) return;
  markerEls.forEach((el, id) => el.classList.toggle('is-selected', id === siteId));
  const site = currentData.siteById.get(siteId);
  if (!site) return;
  globe.controls().autoRotate = false;
  const alt = Math.max(1.5, Math.min(2.1, globe.pointOfView().altitude));
  globe.pointOfView({ lat: site.center.lat, lng: site.center.lon, altitude: alt }, ms);
}

// Small 3D Moon or Mars with the mission site marked by pulsing rings.
// One globe per body (at most two for the session), re-attached on re-render, so textures never get mixed.
import Globe from 'globe.gl';
import { asset } from '../data.js';

const TEXTURES = { moon: 'geo/moon_texture.jpg', mars: 'geo/mars_texture.jpg' };
const FALLBACK_COLOR = { moon: '#9aa1ab', mars: '#b07a52' };

const instances = new Map(); // body -> { globe, host }
let resizeObs = null;

function textureExists(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function create(body) {
  const host = document.createElement('div');
  host.className = 'target-globe__host';
  const url = TEXTURES[body] ? asset(TEXTURES[body]) : null;
  const hasTexture = url ? await textureExists(url) : false;

  const globe = Globe({ animateIn: false })(host)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(false)
    .showGraticules(true)
    .ringColor(() => (t) => `rgba(242, 169, 59, ${1 - t})`)
    .ringMaxRadius(6)
    .ringPropagationSpeed(2.5)
    .ringRepeatPeriod(900)
    .pointColor(() => '#F2A93B')
    .pointAltitude(0.02)
    .pointRadius(0.9);
  if (hasTexture) {
    globe.globeImageUrl(url);
  } else {
    // No texture for this body yet: plain coloured sphere.
    globe.globeMaterial()?.color?.set(FALLBACK_COLOR[body] || '#888888');
  }
  const controls = globe.controls();
  controls.enableZoom = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
  });
  const inst = { globe, host };
  instances.set(body, inst);
  return inst;
}

export async function renderTargetGlobe(mount, target) {
  const c = document.createElement('canvas');
  if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('WebGL is not available');
  const { globe, host } = instances.get(target.body) || (await create(target.body));
  mount.appendChild(host);

  const fit = () => {
    const { width, height } = mount.getBoundingClientRect();
    if (width > 0 && height > 0) globe.width(width).height(height);
  };
  fit();
  resizeObs?.disconnect();
  resizeObs = new ResizeObserver(fit);
  resizeObs.observe(mount);

  const zone = [{ lat: target.center.lat, lng: target.center.lon }];
  globe.ringsData(zone).pointsData(zone);
  // Polar targets (Shackleton) are seen from 60° latitude so the pole is visible; the rest from the side.
  const lat = Math.abs(target.center.lat) > 70 ? Math.sign(target.center.lat) * 60 : target.center.lat;
  globe.pointOfView({ lat, lng: target.center.lon, altitude: 1.9 }, 0);
}

// Loads the precomputed data package from public/data and builds lookup indexes.
// The app never computes scores: it only reads, filters and sorts what is here.

const BASE = import.meta.env.BASE_URL;

// The single-file build (npm run build:single) embeds every data file and map as a data: URI
// in window.__LT_ASSETS__, so the page also works when opened straight from disk.
const EMBEDDED = typeof window !== 'undefined' ? window.__LT_ASSETS__ : null;

export const asset = (path) => EMBEDDED?.[path] ?? `${BASE}${path}`.replace(/\/{2,}/g, '/');

async function loadJson(name) {
  const res = await fetch(asset(`data/${name}`));
  if (!res.ok) throw new Error(`Cannot load data/${name}: HTTP ${res.status}`);
  return res.json();
}

/** Optional files (photos) may be missing in older data packages: return a fallback instead of failing. */
async function loadOptionalJson(name, fallback) {
  try {
    return await loadJson(name);
  } catch {
    return fallback;
  }
}

export async function loadData() {
  const [sitesFile, scoresFile, featuresFile, missions, labels, materialMatrix] = await Promise.all([
    loadJson('sites.json'),
    loadJson('scores.json'),
    loadJson('features.json'),
    loadJson('missions.json'),
    loadJson('labels.json'),
    loadJson('material_matrix.json'),
  ]);
  const photosFile = await loadOptionalJson('photos.json', { photos: [] });
  const project = await loadOptionalJson('project.json', { about: null, team: [] });
  const photosBySite = new Map();
  for (const ph of photosFile.photos || []) {
    if (!photosBySite.has(ph.site_id)) photosBySite.set(ph.site_id, []);
    photosBySite.get(ph.site_id).push(ph);
  }

  const sites = sitesFile.sites;
  const siteById = new Map(sites.map((s) => [s.id, s]));

  // features: site_id -> { feature -> record }
  const featuresBySite = new Map();
  for (const f of featuresFile.features) {
    if (!featuresBySite.has(f.site_id)) featuresBySite.set(f.site_id, {});
    featuresBySite.get(f.site_id)[f.feature] = f;
  }

  const pairs = missions.pairs.map(([targetId, task], i) => ({ index: i + 1, targetId, task }));
  const pairKey = (targetId, task) => `${targetId}|${task}`;

  // scores: pairKey -> rows sorted by rank
  const scoresByPair = new Map();
  for (const sc of scoresFile.scores) {
    const key = pairKey(sc.target_id, sc.task);
    if (!scoresByPair.has(key)) scoresByPair.set(key, []);
    scoresByPair.get(key).push(sc);
  }
  for (const rows of scoresByPair.values()) rows.sort((a, b) => a.rank - b.rank);

  const methodCheck = new Map(scoresFile.method_check.map((m) => [pairKey(m.target_id, m.task), m]));

  return {
    meta: { sitesStatus: sitesFile.status, exportedFrom: sitesFile.exported_from, scoresStatus: scoresFile.status },
    sites,
    siteById,
    featuresBySite,
    photosFor: (siteId) => photosBySite.get(siteId) || [],
    project,
    missions,
    labels,
    materialMatrix,
    pairs,
    scoresFor: (pair) => scoresByPair.get(pairKey(pair.targetId, pair.task)) || [],
    scoreOf: (siteId, pair) =>
      (scoresByPair.get(pairKey(pair.targetId, pair.task)) || []).find((s) => s.site_id === siteId) || null,
    methodCheckFor: (pair) => methodCheck.get(pairKey(pair.targetId, pair.task)) || null,
    // Maximum points a contribution bar can reach for this task and site (CLAUDE.md §3).
    // Relief features are weighted by the share of the circle with valid data; when part of the
    // circle has no data, the weights are renormalised, so material and ice can reach more points.
    contribMax: (task, key, siteId = null) => {
      const ew = missions.exposure?.weight ?? 0.2;
      if (key === 'exposure') return ew * 100;
      const weights = missions.weights[task] || {};
      const q = (k) => {
        if (k === 'material' || k === 'ice' || !siteId) return 1;
        return featuresBySite.get(siteId)?.[k]?.valid_fraction ?? 1;
      };
      const wsum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
      const den = Object.entries(weights).reduce((a, [k, w]) => a + w * q(k), 0) || wsum;
      return ((1 - ew) * 100 * (weights[key] ?? 0) * q(key)) / den;
    },
  };
}

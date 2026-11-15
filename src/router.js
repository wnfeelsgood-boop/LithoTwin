// Hash router. Routes: #/ (world), #/russia, #/site/<id>, #/about.
// Shared state (pair, filter) lives in the hash query so links can be shared: #/?pair=3&f=nored

export const FILTERS = ['all', 'nored', 'green'];
export const DEFAULT_FILTER = 'nored';

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);

  let view = 'world';
  let siteId = null;
  if (parts[0] === 'russia') view = 'russia';
  else if (parts[0] === 'about') view = 'about';
  else if (parts[0] === 'site' && parts[1]) {
    view = 'site';
    siteId = decodeURIComponent(parts[1]);
  }

  const pairNum = Number.parseInt(params.get('pair'), 10);
  const filter = FILTERS.includes(params.get('f')) ? params.get('f') : DEFAULT_FILTER;
  return {
    view,
    siteId,
    pair: Number.isFinite(pairNum) ? pairNum : null, // 1-based index into missions.pairs, null = default
    filter,
    vs: params.get('vs'),
  };
}

export function buildHash({ view = 'world', siteId = null, pair = null, filter = DEFAULT_FILTER, vs = null } = {}) {
  let path = '/';
  if (view === 'russia') path = '/russia';
  else if (view === 'about') path = '/about';
  else if (view === 'site' && siteId) path = `/site/${encodeURIComponent(siteId)}`;

  const params = new URLSearchParams();
  if (pair) params.set('pair', String(pair));
  if (filter && filter !== DEFAULT_FILTER) params.set('f', filter);
  if (vs) params.set('vs', vs);
  const q = params.toString();
  return `#${path}${q ? `?${q}` : ''}`;
}

/** Merge a patch into the current route and navigate. */
export function navigate(patch) {
  const next = { ...parseHash(), ...patch };
  const hash = buildHash(next);
  if (hash !== location.hash) location.hash = hash;
}

export function onRouteChange(fn) {
  window.addEventListener('hashchange', () => fn(parseHash()));
}

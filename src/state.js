// Small shared UI state that does not belong in the URL.

export const state = {
  selectedId: null, // site highlighted on the world screen
  globeFailed: false, // set when WebGL / globe.gl cannot start

  /** Current pair from the route, falling back to pair 1. */
  pair(data, route) {
    return data.pairs.find((p) => p.index === route.pair) || data.pairs[0];
  },

  /** Pair where a site ranks best: default context for its dossier. */
  bestPairFor(data, siteId) {
    let best = data.pairs[0];
    let bestRank = Infinity;
    for (const p of data.pairs) {
      const sc = data.scoreOf(siteId, p);
      if (sc && sc.rank < bestRank) {
        bestRank = sc.rank;
        best = p;
      }
    }
    return best;
  },
};

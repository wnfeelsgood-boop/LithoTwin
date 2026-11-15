// Pentagon marker as inline SVG. Encoding (CLAUDE.md §4.2):
// size = similarity, fill = suitability, number = rank, dashed grey outline = negative control.

const POINTS = '50,4 96,38 78,94 22,94 4,38';

export const SUIT_COLOR = { pass: 'var(--pass)', warn: 'var(--warn)', fail: 'var(--fail)' };

/** Size in px from similarity 0..100 → 18..44. */
export const markerSize = (similarity) => Math.round(18 + (26 * Math.max(0, Math.min(100, similarity))) / 100);

export function pentagonSvg({ suitability, rank = null, negative = false, size = 24, title = '' }) {
  const fill = negative ? 'none' : SUIT_COLOR[suitability] || 'var(--muted)';
  const stroke = negative ? 'var(--muted)' : 'rgba(7,10,16,.55)';
  const dash = negative ? 'stroke-dasharray="9 7"' : '';
  const textColor = negative ? 'var(--muted)' : '#070A10';
  // Without a rank the pentagon carries a symbol, so suitability is readable without colour: ✓ / ! / ✕.
  const SYMBOL = { pass: '✓', warn: '!', fail: '✕' };
  const text =
    rank != null
      ? `<text x="50" y="66" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="600"
           font-size="${rank > 9 ? 34 : 40}" fill="${textColor}">${rank}</text>`
      : !negative && SYMBOL[suitability]
        ? `<text x="50" y="69" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800"
             font-size="50" fill="${textColor}">${SYMBOL[suitability]}</text>`
        : '';
  return `<svg class="pentagon" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="${title ? 'false' : 'true'}"
    ${title ? `role="img" aria-label="${title}"` : ''}>
    <polygon points="${POINTS}" fill="${fill}" stroke="${stroke}" stroke-width="${negative ? 6 : 4}" ${dash}
      stroke-linejoin="round"/>${text}</svg>`;
}

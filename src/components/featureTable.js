// Relief figures and class labels for one site, formatted with units from labels.json.
import { label, ui } from '../i18n.js';
import { num, esc } from '../format.js';

export const RELIEF_KEYS = ['slope_p50', 'slope_p90', 'flat_frac', 'local_relief', 'roughness_rms'];

const EXPOSURE_WORD = { 1: 'high', 0.5: 'medium', 0: 'low' };

/** Formatted value of one feature or class for a site. Returns '—' when missing. */
export function featureText(data, site, key) {
  if (key === 'material') return label(data.labels, 'material_class', site.material_class) || '—';
  if (key === 'ice') return site.ice_class == null ? '—' : label(data.labels, 'ice_class', site.ice_class) || '—';
  const rec = data.featuresBySite.get(site.id)?.[key];
  if (!rec || rec.value == null) return '—';
  if (key === 'exposure') return ui(`exposure_${EXPOSURE_WORD[rec.value] ?? 'medium'}`);
  if (key === 'flat_frac') return `${num(rec.value * 100, 0)}%`;
  const unit = data.labels.feature[key]?.unit ?? '';
  const digits = unit === '°' ? 1 : 0;
  return `${num(rec.value, digits)}${unit === '°' ? '°' : ` ${unit}`}`;
}

export function featureName(data, key) {
  return label(data.labels, 'feature', key);
}

/** Compact two-column table (feature, value) for the target card on the world screen. */
export function targetNumbersHtml(data, target, keys = ['slope_p90', 'flat_frac', 'local_relief', 'material', 'ice']) {
  return `
    <section class="target-numbers panel">
      <div class="step-label">${esc(ui('targetNumbers'))}</div>
      <dl>
        ${keys
          .map(
            (k) => `<div class="kv"><dt>${esc(capitalize(featureName(data, k)))}</dt>
            <dd class="${k === 'material' || k === 'ice' ? '' : 'mono'}">${esc(featureText(data, target, k))}</dd></div>`
          )
          .join('')}
      </dl>
    </section>`;
}

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

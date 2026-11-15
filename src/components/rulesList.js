// Suitability rules: one card per rule with its verdict and a one-line reason built from the data.
import { ui, label } from '../i18n.js';
import { num, esc } from '../format.js';
import { pentagonSvg } from './pentagon.js';

function drillRuleParts(rule) {
  const iceMatch = /ice_class\s*>=\s*(\d)/.exec(rule?.pass_if || '');
  const listMatch = /material in \[([^\]]*)\]/.exec(rule?.pass_if || '');
  return {
    iceMin: iceMatch ? Number(iceMatch[1]) : null,
    materials: listMatch ? listMatch[1].split(',').map((s) => s.trim()) : [],
  };
}

function reason(data, site, key, task) {
  const rules = data.missions.suitability?.rules || {};
  const feats = data.featuresBySite.get(site.id) || {};
  if (key === 'bare_ground') return label(data.labels, 'bare_class', site.bare_class);
  if (key === 'access') return label(data.labels, 'access', site.access);
  if (key === 'flat_area') {
    const r = rules.flat_area;
    const v = feats.flat_frac?.value;
    return ui('rule_flat_reason', {
      value: v == null ? '—' : `${num(v * 100, 0)}%`,
      pass: `${num(r.pass_if_ge * 100, 0)}%`,
      warn: `${num(r.warn_if_ge * 100, 0)}%`,
    });
  }
  if (key === 'slope_p90') {
    const r = rules.slope_p90;
    const v = feats.slope_p90?.value;
    return ui('rule_slope_reason', {
      value: v == null ? '—' : `${num(v, 1)}°`,
      pass: `${r.pass_if_le}°`,
      warn: `${r.warn_if_le}°`,
    });
  }
  if (key === 'drill_target') {
    const { iceMin, materials } = drillRuleParts(rules.drill_target);
    if (iceMin != null && site.ice_class >= iceMin) return ui('rule_drill_ice', { ice: label(data.labels, 'ice_class', site.ice_class) });
    if (materials.includes(site.material_class))
      return ui('rule_drill_rock', { rock: label(data.labels, 'material_class', site.material_class) });
    return ui('rule_drill_none');
  }
  return '';
}

export function rulesListHtml(data, site, score) {
  const entries = Object.entries(score.suitability_rules || {});
  if (!entries.length) return '';
  return `
    <section class="rules">
      <h2 class="section-title">${esc(ui('suitabilityRules'))}</h2>
      <ul class="rules__list">
        ${entries
          .map(
            ([key, verdict]) => `
          <li class="rule panel">
            ${pentagonSvg({ suitability: verdict, size: 20 })}
            <div>
              <div class="rule__title">${esc(label(data.labels, 'suitability_rule', key))} ·
                <span class="suit-text--${verdict}">${esc(label(data.labels, 'suitability', verdict))}</span></div>
              <div class="rule__reason muted">${esc(reason(data, site, key, score.task))}</div>
            </div>
          </li>`
          )
          .join('')}
      </ul>
    </section>`;
}

/** Names of the rules that set the overall verdict, e.g. "access and bare ground". */
export function worstRuleNames(data, score) {
  if (score.suitability === 'pass') return '';
  const names = Object.entries(score.suitability_rules || {})
    .filter(([, v]) => v === score.suitability)
    .map(([k]) => label(data.labels, 'suitability_rule', k).toLowerCase());
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} ${ui('and')} ${names[names.length - 1]}`;
}

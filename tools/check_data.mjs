// Data integrity check for LithoTwin. Run: npm test
// Fails (exit 1) on broken joins, counts, sums, ranks, missing maps or labels.
// Prints warnings (no failure) for known gaps: null intros, missing EN text, partial coverage.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const load = (name) => JSON.parse(readFileSync(join(root, 'data', name), 'utf8'));

const sites = load('sites.json').sites;
const scoresFile = load('scores.json');
const scores = scoresFile.scores;
const features = load('features.json').features;
const missions = load('missions.json');
const labels = load('labels.json');

const errors = [];
const warnings = [];
const siteIds = new Set(sites.map((s) => s.id));
const realSites = sites.filter((s) => s.kind === 'site');

// Joins
for (const sc of scores) {
  if (!siteIds.has(sc.site_id)) errors.push(`score: unknown site_id ${sc.site_id}`);
  if (!siteIds.has(sc.target_id)) errors.push(`score: unknown target_id ${sc.target_id}`);
}
for (const f of features) {
  if (!siteIds.has(f.site_id)) errors.push(`feature: unknown site_id ${f.site_id}`);
}

// Counts
const expected = realSites.length * missions.pairs.length;
if (scores.length !== expected) errors.push(`scores: expected ${expected}, got ${scores.length}`);

// Per pair: count, ranks, contribution sums
for (const [target, task] of missions.pairs) {
  const rows = scores.filter((s) => s.target_id === target && s.task === task);
  if (rows.length !== realSites.length) {
    errors.push(`pair ${target}×${task}: expected ${realSites.length} scores, got ${rows.length}`);
  }
  const ranks = rows.map((r) => r.rank).sort((a, b) => a - b);
  if (!ranks.every((r, i) => r === i + 1)) errors.push(`pair ${target}×${task}: ranks are not 1..${rows.length}`);
  // Ranks come from unrounded scores, so equal rounded values may appear in either order.
  const byRank = [...rows].sort((a, b) => a.rank - b.rank);
  byRank.forEach((r, i) => {
    if (i > 0 && r.similarity > byRank[i - 1].similarity) {
      errors.push(`pair ${target}×${task}: ${r.site_id} (rank ${r.rank}) has higher similarity than rank ${r.rank - 1}`);
    }
  });
  for (const r of rows) {
    const sum = Object.values(r.contrib).reduce((a, b) => a + b, 0);
    // Each of the 8 parts is rounded to 0.1 separately, so the sum may drift by up to 0.4.
    if (Math.abs(sum - r.similarity) > 0.4) {
      errors.push(`score ${r.site_id} ${target}×${task}: contrib sum ${sum.toFixed(2)} ≠ similarity ${r.similarity}`);
    }
    if (!labels.suitability[r.suitability]) errors.push(`no label for suitability ${r.suitability}`);
    for (const rule of Object.keys(r.suitability_rules)) {
      if (!labels.suitability_rule[rule]) errors.push(`no label for suitability_rule ${rule}`);
    }
    for (const key of Object.keys(r.contrib)) {
      if (!labels.feature[key]) errors.push(`no label for feature ${key}`);
    }
    if (r.completeness < 1) warnings.push(`${r.site_id}: completeness ${r.completeness} (${target}×${task})`);
  }
  if (!labels.task[task]) errors.push(`no label for task ${task}`);
}

// Maps and class labels
for (const s of sites) {
  if (!s.map || !existsSync(join(root, s.map))) errors.push(`${s.id}: map file missing (${s.map})`);
  if (!labels.group[s.group]) errors.push(`${s.id}: no label for group ${s.group}`);
  if (s.material_class && !labels.material_class[s.material_class]) errors.push(`${s.id}: no label for material ${s.material_class}`);
  if (s.ice_class != null && !labels.ice_class[String(s.ice_class)]) errors.push(`${s.id}: no label for ice ${s.ice_class}`);
  if (s.bare_class && !labels.bare_class[s.bare_class]) errors.push(`${s.id}: no label for bare ${s.bare_class}`);
  if (s.access && !labels.access[s.access]) errors.push(`${s.id}: no label for access ${s.access}`);
  if (!s.name?.ru && !s.name?.en) errors.push(`${s.id}: no name`);

  const d = s.dossier || {};
  if (!d.intro) warnings.push(`${s.id}: intro is null`);
  const texts = [d.intro, d.summary, ...(d.similar || []), ...(d.differs || []), ...(d.use || [])].filter(Boolean);
  const noEn = texts.filter((x) => !x.en).length;
  if (noEn) warnings.push(`${s.id}: ${noEn} dossier text(s) without EN`);
}
for (const f of features) {
  if (!labels.feature[f.feature]) errors.push(`feature ${f.feature}: no label`);
}

// Photos (optional file): known site, file present, credit and licence filled in
if (existsSync(join(root, 'data', 'photos.json'))) {
  const photos = load('photos.json').photos || [];
  for (const ph of photos) {
    if (!siteIds.has(ph.site_id)) errors.push(`photo: unknown site_id ${ph.site_id}`);
    if (!ph.file || !existsSync(join(root, ph.file))) errors.push(`photo ${ph.site_id}: file missing (${ph.file})`);
    if (!ph.credit || !ph.license) errors.push(`photo ${ph.site_id}: credit and license are required`);
  }
  const withPhoto = new Set(photos.map((p) => p.site_id));
  const without = sites.filter((s) => !withPhoto.has(s.id)).map((s) => s.id);
  if (without.length) warnings.push(`no photo yet: ${without.join(', ')}`);
}

if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  for (const w of warnings) console.log('  - ' + w);
}
if (errors.length) {
  console.error(`\nFAILED: ${errors.length} error(s)`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log(`\nOK: ${sites.length} sites, ${scores.length} scores, ${features.length} features, ${missions.pairs.length} pairs.`);

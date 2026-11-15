// "Method & data" page. Tables are rendered from missions.json, scores.json and material_matrix.json,
// so they stay correct when the data package is updated.
import { ui, label } from '../i18n.js';
import { num, esc } from '../format.js';
import { pairLabel } from '../components/pairPicker.js';
import { capitalize } from '../components/featureTable.js';

const REPO = 'https://github.com/wnfeelsgood-boop/LithoTwin44';

function weightsTable(data) {
  const tasks = Object.keys(data.missions.weights);
  const features = Object.keys(data.missions.weights[tasks[0]]);
  return `
    <div class="table-wrap panel"><table class="compare__table">
      <thead><tr><th>Feature</th>${tasks.map((k) => `<th>${esc(label(data.labels, 'task', k))}</th>`).join('')}</tr></thead>
      <tbody>${features
        .map(
          (f) => `<tr><th scope="row">${esc(capitalize(label(data.labels, 'feature', f)))}</th>${tasks
            .map((k) => `<td class="mono">${num(data.missions.weights[k][f], 2)}</td>`)
            .join('')}</tr>`
        )
        .join('')}</tbody>
    </table></div>`;
}

function toleranceList(data) {
  const tol = data.missions.tolerance || {};
  return `<ul>${Object.entries(tol)
    .map(([f, r]) => {
      const name = capitalize(label(data.labels, 'feature', f));
      const unit = data.labels.feature[f]?.unit ?? '';
      if (r.type === 'linear') {
        const tau = f === 'flat_frac' ? `${num(r.tau * 100, 0)} percentage points` : `${r.tau}${unit === '°' ? '°' : ` ${unit}`}`;
        return `<li><strong>${esc(name)}</strong>: linear, similarity falls to 0 at a difference of ${esc(tau)}.</li>`;
      }
      return `<li><strong>${esc(name)}</strong>: log-ratio, similarity falls to 0 when one value is ${r.base}× the other.</li>`;
    })
    .join('')}
    <li><strong>Material</strong>: looked up in the rock similarity matrix below.</li>
    <li><strong>Ice</strong>: 1 − |difference in ice class| / ${data.missions.ice_scale ?? 3}.</li>
  </ul>`;
}

function rulesList(data) {
  const r = data.missions.suitability?.rules || {};
  const v = (code) => `<span class="suit-text--${code}">${esc(label(data.labels, 'suitability', code))}</span>`;
  const items = [];
  if (r.bare_ground) {
    const all = r.bare_ground.all;
    items.push(
      `<li><strong>${esc(label(data.labels, 'suitability_rule', 'bare_ground'))}</strong>: ${Object.entries(all)
        .map(([k, x]) => `${esc(label(data.labels, 'bare_class', k))} → ${v(x)}`)
        .join('; ')}. For drilling, little bare ground is only a caveat.</li>`
    );
  }
  if (r.access) {
    items.push(
      `<li><strong>${esc(label(data.labels, 'suitability_rule', 'access'))}</strong>: ${Object.entries(r.access)
        .map(([k, x]) => `${esc(label(data.labels, 'access', k))} → ${v(x)}`)
        .join('; ')}.</li>`
    );
  }
  if (r.flat_area) {
    items.push(
      `<li><strong>${esc(label(data.labels, 'suitability_rule', 'flat_area'))}</strong> (${esc(label(data.labels, 'task', r.flat_area.task))}): flat share ≥ ${num(
        r.flat_area.pass_if_ge * 100,
        0
      )}% → ${v('pass')}, ≥ ${num(r.flat_area.warn_if_ge * 100, 0)}% → ${v('warn')}, otherwise ${v('fail')}.</li>`
    );
  }
  if (r.slope_p90) {
    items.push(
      `<li><strong>${esc(label(data.labels, 'suitability_rule', 'slope_p90'))}</strong> (${esc(label(data.labels, 'task', r.slope_p90.task))}): slope P90 ≤ ${
        r.slope_p90.pass_if_le
      }° → ${v('pass')}, ≤ ${r.slope_p90.warn_if_le}° → ${v('warn')}, otherwise ${v('fail')}.</li>`
    );
  }
  if (r.drill_target) {
    items.push(
      `<li><strong>${esc(label(data.labels, 'suitability_rule', 'drill_target'))}</strong> (${esc(
        label(data.labels, 'task', r.drill_target.task)
      )}): ground ice of class 2 or more, or clays, evaporites, basalts or loose deposits → ${v('pass')}, otherwise ${v('warn')}.</li>`
    );
  }
  return `<ul>${items.join('')}</ul>`;
}

function validationTable(data) {
  return `
    <div class="table-wrap panel"><table class="compare__table">
      <thead><tr><th>Target and task</th><th>Median of known analogs</th><th>Best negative control</th><th>Pass</th><th>Robust runs</th></tr></thead>
      <tbody>${data.pairs
        .map((p) => {
          const m = data.methodCheckFor(p);
          if (!m) return '';
          return `<tr><th scope="row">${esc(pairLabel(data, p))}</th>
            <td class="mono">${num(m.analog_median)}</td><td class="mono">${num(m.best_negative)}</td>
            <td class="${m.pass ? 'suit-text--pass' : 'suit-text--fail'}">${m.pass ? '✓' : '✗'}</td>
            <td class="mono">${m.robust_runs} / ${m.runs}</td></tr>`;
        })
        .join('')}</tbody>
    </table></div>`;
}

function matrixTable(data) {
  const { classes, matrix } = data.materialMatrix;
  const cell = (x) => `<td class="mono heat" style="--h:${x}">${num(x, 1)}</td>`;
  return `
    <div class="table-wrap panel"><table class="compare__table matrix">
      <thead><tr><th></th>${classes.map((c) => `<th>${esc(label(data.labels, 'material_class', c))}</th>`).join('')}</tr></thead>
      <tbody>${classes
        .map((c, i) => `<tr><th scope="row">${esc(label(data.labels, 'material_class', c))}</th>${matrix[i].map(cell).join('')}</tr>`)
        .join('')}</tbody>
    </table></div>`;
}

export function renderAbout(root, data) {
  const w = data.missions.exposure?.weight ?? 0.2;
  root.innerHTML = `
    <main class="page about">
      <h1 class="page-title">${esc(ui('method'))}</h1>

      <section>
        <p class="lead">LithoTwin ranks places on Earth by how closely their relief, rock and ice match a planned landing or base site on the Moon or Mars. It is a decision aid for choosing where to rehearse a mission: similarity orders the list, and a separate traffic light says whether a team can actually work there.</p>
      </section>

      <section>
        <h2 class="section-title">1. How similarity is computed</h2>
        <ul>
          <li>For every site and target we take a <strong>3 km circle</strong> around its centre and resample the elevation model to a <strong>500 m grid</strong> in a local equidistant projection, so Earth, Moon and Mars are measured the same way.</li>
          <li>Five relief features: median slope, slope P90, share of flat ground (&lt; 8°), detrended roughness and local relief (P95 − P5 of elevation). Two classes from the team geologists: rock type (7 classes) and ice (0–3).</li>
          <li>Each feature gives a similarity from 0 to 1 (rules below); the base score is their weighted mean. If relief data covers only part of the circle, relief features get proportionally less weight, and “data coverage” shows how much of the total weight had data.</li>
          <li>Surface exposure (how much bare ground is visible: high, medium or low) adds up to ${num(w * 100, 0)} points: <span class="mono">S = ${num(1 - w, 1)} · S_base + ${num(w * 100, 0)} · exposure</span>.</li>
        </ul>
        <h3 class="sub-title">Weights per task</h3>
        ${weightsTable(data)}
        <h3 class="sub-title">Tolerances</h3>
        ${toleranceList(data)}
      </section>

      <section>
        <h2 class="section-title">2. Suitability rules</h2>
        <p>Each rule gives a verdict; the worst one wins. Suitability is never mixed into the similarity number.</p>
        ${rulesList(data)}
      </section>

      <section>
        <h2 class="section-title">3. Does the method work?</h2>
        <p>Each target has a list of known analogs from the literature, and two negative controls (Amazon rainforest, Kansas farmland) that should never look like the Moon or Mars. The check passes when the best negative control scores below the median of the known analogs. We repeat it ${
          data.missions.validation?.sensitivity?.runs ?? 50
        } times with all weights shifted at random by up to ±${num((data.missions.validation?.sensitivity?.weight_jitter ?? 0.2) * 100, 0)}%.</p>
        ${validationTable(data)}
      </section>

      <section>
        <h2 class="section-title">4. Rock similarity matrix</h2>
        <p>Expert judgement by the team geologists (draft): 1 = same class, 0 = nothing in common.</p>
        ${matrixTable(data)}
      </section>

      <section>
        <h2 class="section-title">5. Data sources and attribution</h2>
        <ul class="sources-list">
          <li><strong>Earth relief:</strong> Copernicus DEM GLO-90, ESA. Produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.</li>
          <li><strong>Moon relief:</strong> LRO LOLA, LDEM_80S_80M (NASA PDS Geosciences Node).</li>
          <li><strong>Mars relief:</strong> MGS MOLA MEGDR 128 pixels per degree, tiles megt88n180hb and megt44n000hb (NASA PDS Geosciences Node).</li>
          <li><strong>Rock, ice, bare-ground and access classes, dossier texts:</strong> team geologists, from the literature cited in each dossier.</li>
          <li><strong>Target images:</strong> MRO HiRISE (NASA/JPL-Caltech/UArizona) and LRO LROC NAC (NASA/GSFC/Arizona State University), public domain; credits under each image.</li>
          <li><strong>Moon and Mars globe textures:</strong> Solar System Scope (solarsystemscope.com), CC BY 4.0, based on NASA imagery.</li>
          <li><strong>Country outlines:</strong> Natural Earth (public domain) via the <span class="mono">world-atlas</span> package.</li>
        </ul>
      </section>

      <section>
        <h2 class="section-title">6. Limitations</h2>
        <ul>
          <li>Dossier texts, class assignments and the rock matrix are drafts from a 48-hour hackathon and have not been peer-reviewed.</li>
          <li>Tolbachik: the circle centre was moved to the lava plateau and still needs a check against satellite imagery.</li>
          <li>Mars relief (MOLA, about 463 m per pixel) is much coarser than Earth's (90 m), which smooths Martian roughness.</li>
          <li>Similarity says nothing about logistics, permits or cost; that is what the suitability rules only begin to cover.</li>
        </ul>
      </section>

      <section>
        <h2 class="section-title">7. Team and AI disclosure</h2>
        <p>German Raikov (team lead), Nikolai Shveshkeev and Murat Arifullin (geology), Damir Kudiakov (code review).</p>
        <p>The code was written with Claude Code (Anthropic) under the team's direction and reviewed by a team member. Relief features, scores and the data package were produced with Claude from public elevation models using the scripts in <span class="mono">/tools</span>. Rock, ice and exposure classes and dossier texts were written or checked by the team geologists. Details: <a href="${REPO}/blob/main/docs/AI_DISCLOSURE.md" target="_blank" rel="noopener">AI disclosure</a> · <a href="${REPO}" target="_blank" rel="noopener">source code (MIT)</a>.</p>
      </section>
    </main>`;
}

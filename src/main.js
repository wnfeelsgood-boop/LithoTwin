// Entry point. M1: load data and show a plain ranked list for pair 1.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles/tokens.css';
import './styles/base.css';

import { loadData } from './data.js';
import { t, ui, label, getLang } from './i18n.js';
import { num, esc } from './format.js';

const app = document.getElementById('app');

async function start() {
  app.innerHTML = `<main class="page"><p class="muted">${esc(ui('loading'))}</p></main>`;
  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<main class="page"><p>${esc(ui('loadError'))}</p></main>`;
    return;
  }
  document.documentElement.lang = getLang();

  const pair = data.pairs[0];
  const target = data.siteById.get(pair.targetId);
  const rows = data.scoresFor(pair);

  app.innerHTML = `
    <main class="page">
      <h1>LithoTwin</h1>
      <p class="muted">${esc(ui('subtitle'))}</p>
      <h2>${esc(t(target.name))} · ${esc(label(data.labels, 'task', pair.task))}</h2>
      <ol>
        ${rows
          .map((r) => {
            const s = data.siteById.get(r.site_id);
            return `<li>${esc(t(s.name))} · <span class="mono">${num(r.similarity)}</span> ·
              ${esc(label(data.labels, 'suitability', r.suitability))} · ${esc(label(data.labels, 'group', s.group))}</li>`;
          })
          .join('')}
      </ol>
    </main>`;
}

start();

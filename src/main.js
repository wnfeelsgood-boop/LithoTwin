// Entry point: load data, draw the top bar, route between screens.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

import { loadData } from './data.js';
import { ui, getLang, setLang, onLangChange } from './i18n.js';
import { esc } from './format.js';
import { parseHash, onRouteChange, navigate } from './router.js';
import { pentagonSvg } from './components/pentagon.js';
import { renderWorld } from './views/world.js';
import { renderDossier } from './views/dossier.js';
import { renderRussia } from './views/russia.js';
import { renderAbout } from './views/about.js';
import { renderProject } from './views/project.js';

const app = document.getElementById('app');
let data = null;

function topBarHtml(route) {
  const lang = getLang();
  const seg = (view, key) =>
    `<button type="button" class="${route.view === view ? 'is-on' : ''}" aria-pressed="${route.view === view}"
      data-nav="${view}">${esc(ui(key))}</button>`;
  return `
    <header class="topbar">
      <a class="brand" href="#/" aria-label="LithoTwin home">
        ${pentagonSvg({ suitability: 'warn', size: 26 })}
        <span class="brand__name">LithoTwin</span>
        <span class="brand__sub">${esc(ui('subtitle'))}</span>
      </a>
      <nav class="topbar__nav segmented" aria-label="Mode">
        ${seg('world', 'world')}${seg('russia', 'russia')}
      </nav>
      <div class="topbar__right">
        <a class="btn${route.view === 'about' ? ' is-on' : ''}" href="#/about">${esc(ui('method'))}</a>
        <a class="btn${route.view === 'project' ? ' is-on' : ''}" href="#/project">${esc(ui('project'))}</a>
        <div class="lang segmented" role="group" aria-label="Language">
          <button type="button" data-lang="en" aria-pressed="${lang === 'en'}" class="${lang === 'en' ? 'is-on' : ''}">EN</button>
          <button type="button" data-lang="ru" aria-pressed="${lang === 'ru'}" class="${lang === 'ru' ? 'is-on' : ''}">RU</button>
        </div>
      </div>
    </header>`;
}

function footerHtml() {
  return `<footer class="footer muted">${esc(ui('footer'))}</footer>`;
}

function render() {
  const route = parseHash();
  app.innerHTML = `${topBarHtml(route)}<div id="view"></div>${footerHtml()}`;
  const view = app.querySelector('#view');

  app.querySelectorAll('[data-nav]').forEach((b) =>
    b.addEventListener('click', () => navigate({ view: b.dataset.nav, siteId: null }))
  );
  app.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));

  if (route.view === 'world') renderWorld(view, data, route);
  else if (route.view === 'site') renderDossier(view, data, route);
  else if (route.view === 'russia') renderRussia(view, data, route);
  else if (route.view === 'project') renderProject(view, data);
  else renderAbout(view, data, route);

  if (route.view !== 'world') window.scrollTo(0, 0);
}

async function start() {
  document.documentElement.lang = getLang();
  app.innerHTML = `<main class="page"><p class="muted">${esc(ui('loading'))}</p></main>`;
  try {
    data = await loadData();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<main class="page"><p>${esc(ui('loadError'))}</p></main>`;
    return;
  }
  render();
  onRouteChange(render);
  onLangChange(render);
}

start();

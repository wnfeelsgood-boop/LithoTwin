// Temporary page for screens that later milestones build (dossier M3, Russia M5, About M6).
import { t } from '../i18n.js';
import { esc } from '../format.js';

export function renderPlaceholder(root, data, route) {
  const site = route.siteId ? data.siteById.get(route.siteId) : null;
  const title = site ? t(site.name) : route.view === 'russia' ? 'Russia' : 'Method & data';
  root.innerHTML = `
    <main class="page">
      <p><a href="#/">← Ranking</a></p>
      <h1 class="page-title">${esc(title)}</h1>
      <p class="muted">This screen is being built.</p>
    </main>`;
}

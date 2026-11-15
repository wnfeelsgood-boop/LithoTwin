// "About project" page: team members and a free text the team writes in public/data/project.json.
import { t, ui } from '../i18n.js';
import { esc } from '../format.js';

export function renderProject(root, data) {
  const p = data.project || {};
  const about = t(p.about);
  const team = p.team || [];
  root.innerHTML = `
    <main class="page project">
      <h1 class="page-title">${esc(ui('project'))}</h1>
      ${about ? `<section class="project__about">${about.split(/\n{2,}/).map((para) => `<p>${esc(para)}</p>`).join('')}</section>` : ''}
      <section>
        <h2 class="section-title">${esc(ui('team'))}</h2>
        <ul class="team">
          ${team
            .map((m) => {
              const name = t(m.name) || '';
              const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('');
              const role = t(m.role);
              return `<li class="team__card panel">
                <span class="team__avatar" aria-hidden="true">${esc(initials)}</span>
                <span><strong class="team__name">${esc(name)}</strong>${role ? `<span class="team__role muted">${esc(role)}</span>` : ''}</span>
              </li>`;
            })
            .join('')}
        </ul>
      </section>
    </main>`;
}

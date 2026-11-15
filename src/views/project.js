// "About project" page: logo, text above the team, team members, text below the team.
// Everything comes from public/data/project.json; a missing block is simply not shown.
import { t, ui } from '../i18n.js';
import { esc } from '../format.js';
import { asset } from '../data.js';

const paragraphs = (text, cls) =>
  text ? `<section class="project__text ${cls}">${text.split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('')}</section>` : '';

export function renderProject(root, data) {
  const p = data.project || {};
  const team = p.team || [];
  root.innerHTML = `
    <main class="page project">
      ${
        p.logo
          ? `<h1 class="project__logo"><img src="${esc(asset(p.logo))}" alt="LithoTwin" width="1106" height="484" /></h1>`
          : `<h1 class="page-title">${esc(ui('project'))}</h1>`
      }
      ${paragraphs(t(p.intro), 'project__intro')}
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
      ${paragraphs(t(p.outro), 'project__outro')}
    </main>`;
}

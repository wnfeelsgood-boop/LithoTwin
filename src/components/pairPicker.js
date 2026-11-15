// Five target × task chips. Labels are built from data (target name + task label), never hard-coded.
import { t, label, ui } from '../i18n.js';
import { esc } from '../format.js';

const BODY_COLOR = { moon: 'var(--moon)', mars: 'var(--mars)', earth: 'var(--ice)' };

export function shortTargetName(site) {
  // "Shackleton crater rim (Moon)" → "Shackleton crater rim": the dot already shows the body.
  return (t(site.name) || '').replace(/\s*\((Moon|Mars|цель|Луна|Марс)\)\s*$/i, '');
}

export function pairLabel(data, pair) {
  const target = data.siteById.get(pair.targetId);
  return `${shortTargetName(target)} · ${label(data.labels, 'task', pair.task)}`;
}

export function bodyDot(body) {
  return `<span class="body-dot" style="--dot:${BODY_COLOR[body] || 'var(--muted)'}"></span>`;
}

export function pairPickerHtml(data, activeIndex) {
  return `
    <div class="pair-picker" role="radiogroup" aria-label="${esc(ui('pairLabel'))}">
      <span class="control-label">${esc(ui('pairLabel'))}</span>
      <div class="chips">
        ${data.pairs
          .map((p) => {
            const target = data.siteById.get(p.targetId);
            const on = p.index === activeIndex;
            return `<button type="button" class="chip${on ? ' is-on' : ''}" role="radio" aria-checked="${on}"
              data-pair="${p.index}">${bodyDot(target.body)}${esc(pairLabel(data, p))}</button>`;
          })
          .join('')}
      </div>
    </div>`;
}

/** World-screen picker (design: left column): target cards, then the tasks available for that target. */
export function targetTaskPickerHtml(data, activePair) {
  const targets = [...new Set(data.pairs.map((p) => p.targetId))];
  const tasks = data.pairs.filter((p) => p.targetId === activePair.targetId);
  return `
    <section class="tt-picker" aria-label="${esc(ui('pairLabel'))}">
      <div class="step-label">1 · ${esc(ui('currentTarget'))}</div>
      <div class="target-list" role="radiogroup">
        ${targets
          .map((id) => {
            const s = data.siteById.get(id);
            const on = id === activePair.targetId;
            return `<button type="button" class="target-btn${on ? ' is-on' : ''}" role="radio" aria-checked="${on}"
                data-target="${esc(id)}">
              <span class="sphere sphere--${esc(s.body)}" aria-hidden="true"></span>
              <span><span class="target-btn__name">${esc(shortTargetName(s))}</span>
              <span class="target-btn__sub">${esc(ui(s.body))}</span></span>
            </button>`;
          })
          .join('')}
      </div>
      <div class="step-label">2 · ${esc(ui('task'))}</div>
      <div class="task-list" role="radiogroup">
        ${tasks
          .map((p) => {
            const on = p.index === activePair.index;
            return `<button type="button" class="task-btn${on ? ' is-on' : ''}" role="radio" aria-checked="${on}"
              data-pair="${p.index}">${esc(label(data.labels, 'task', p.task))}</button>`;
          })
          .join('')}
      </div>
    </section>`;
}

/** Pair to switch to when the user picks another target: keep the task if the target supports it. */
export function pairForTarget(data, targetId, currentTask) {
  return (
    data.pairs.find((p) => p.targetId === targetId && p.task === currentTask) ||
    data.pairs.find((p) => p.targetId === targetId)
  );
}

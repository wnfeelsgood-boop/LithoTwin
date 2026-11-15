// Photos with caption and credit line. Every photo in photos.json carries its author, licence and source.
import { t, ui } from '../i18n.js';
import { esc } from '../format.js';
import { asset } from '../data.js';

export function photoFigureHtml(photo, { compact = false } = {}) {
  const caption = t(photo.caption);
  const credit = [photo.credit, photo.license].filter(Boolean).join(' · ');
  return `
    <figure class="photo${compact ? ' photo--compact' : ''}">
      <a href="${asset(photo.file)}" target="_blank" rel="noopener" class="photo__link">
        <img src="${asset(photo.file)}" alt="${esc(caption || '')}" loading="lazy" />
      </a>
      <figcaption>
        ${caption && !compact ? `<span class="photo__caption">${esc(caption)}</span>` : ''}
        <span class="photo__credit">${esc(credit)}${
          photo.source_url ? ` · <a href="${esc(photo.source_url)}" target="_blank" rel="noopener">${esc(ui('photoSource'))}</a>` : ''
        }</span>
      </figcaption>
    </figure>`;
}

/** Photos section for a dossier: the site's own photos, then the target's for comparison. */
export function photosSectionHtml(data, site, target) {
  const own = data.photosFor(site.id);
  const tgt = target && target.id !== site.id ? data.photosFor(target.id) : [];
  if (!own.length && !tgt.length) return '';
  return `
    <section class="photos">
      <h2 class="section-title">${esc(ui('photos'))}</h2>
      <div class="photos__grid">
        ${own.map((p) => photoFigureHtml(p)).join('')}
        ${tgt.map((p) => photoFigureHtml(p)).join('')}
      </div>
    </section>`;
}

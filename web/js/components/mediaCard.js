import { escapeHtml, TYPE_LABELS } from '../util.js';

export function mediaCardHtml(media, { subtitle = '', navHref } = {}) {
  const cover = media.coverUrl
    ? `<img class="media-cover" src="${escapeHtml(media.coverUrl)}" alt="" />`
    : `<div class="media-cover media-cover-placeholder">${escapeHtml((media.title || '?').slice(0, 1).toUpperCase())}</div>`;
  return `
    <div class="media-card" ${navHref ? `data-nav="${escapeHtml(navHref)}"` : ''}>
      ${cover}
      <div>
        <div class="media-type">${TYPE_LABELS[media.type] ?? media.type}</div>
        <div class="media-title">${escapeHtml(media.title)}</div>
        ${
          media.creator
            ? `<div class="media-creator">${escapeHtml(media.creator)}${media.year ? ' · ' + escapeHtml(media.year) : ''}</div>`
            : ''
        }
        ${subtitle ? `<div class="media-subtitle">${escapeHtml(subtitle)}</div>` : ''}
      </div>
    </div>`;
}

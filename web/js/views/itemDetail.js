import { LogsApi, MediaApi } from '../api/resources.js';
import { starsHtml, wireStarPicker } from '../components/starRating.js';
import { navigate } from '../router.js';
import { escapeHtml, STATUS_LABELS, TYPE_LABELS } from '../util.js';

const STATUSES = ['want', 'in_progress', 'finished', 'dropped'];

function mediaRefFromQuery(query) {
  return {
    type: query.type,
    source: query.source,
    externalId: query.externalId,
    title: query.title,
    creator: query.creator || '',
    year: query.year || '',
    coverUrl: query.coverUrl || '',
  };
}

export async function render(container, params, query) {
  const isNew = params.id === 'new';
  const mediaItemId = isNew ? null : Number(params.id);
  const media = isNew ? mediaRefFromQuery(query) : await MediaApi.detail(mediaItemId);

  let status = null;
  let rating = null;
  let note = '';

  function headerHtml() {
    const cover = media.coverUrl
      ? `<img class="media-cover" style="width:100px;height:150px" src="${escapeHtml(media.coverUrl)}" alt="" />`
      : `<div class="media-cover media-cover-placeholder" style="width:100px;height:150px"></div>`;
    const ratingLine =
      'ratingCount' in media && media.ratingCount > 0
        ? `<div style="margin-top:6px">${starsHtml(Math.round(media.averageRating || 0))} <span class="muted">${media.averageRating.toFixed(1)} (${media.ratingCount})</span></div>`
        : '';
    return `
      <div style="display:flex;gap:16px">
        ${cover}
        <div>
          <div class="media-type">${TYPE_LABELS[media.type] ?? media.type}</div>
          <div style="font-size:20px;font-weight:800">${escapeHtml(media.title)}</div>
          ${media.creator ? `<div class="muted">${escapeHtml(media.creator)}${media.year ? ' · ' + escapeHtml(media.year) : ''}</div>` : ''}
          ${ratingLine}
        </div>
      </div>`;
  }

  function reviewsHtml() {
    if (!('reviews' in media) || media.reviews.length === 0) return '';
    return `
      <div class="section-heading">Reviews</div>
      ${media.reviews
        .map(
          (r) => `
        <div class="card" data-nav="/review/${r.id}" style="cursor:pointer">
          <div style="font-weight:600;font-size:13px" class="muted">${escapeHtml(r.user.displayName)}</div>
          ${r.rating ? starsHtml(r.rating) : ''}
          <div style="font-weight:700">${escapeHtml(r.title)}</div>
          <p class="muted">${escapeHtml(r.body.slice(0, 160))}${r.body.length > 160 ? '…' : ''}</p>
        </div>`
        )
        .join('')}
    `;
  }

  container.innerHTML = `
    ${headerHtml()}
    <div class="section-heading">Log this</div>
    <div class="chip-row" id="status-row">
      ${STATUSES.map((s) => `<button class="chip" data-status="${s}">${STATUS_LABELS[s]}</button>`).join('')}
    </div>
    <div id="rating-picker"></div>
    <textarea id="note" placeholder="Quick note (optional)"></textarea>
    <p class="error" id="log-error" style="display:none"></p>
    <button class="btn-primary" id="save-log" style="margin-top:8px" disabled>Save log</button>
    <p class="muted" id="saved-msg" style="display:none">Saved to your logs.</p>
    <button class="btn-link" id="write-review">Write a full review</button>
    ${reviewsHtml()}
  `;

  wireStarPicker(container.querySelector('#rating-picker'), null, (value) => {
    rating = value;
  });

  container.querySelectorAll('[data-status]').forEach((chip) => {
    chip.addEventListener('click', () => {
      status = chip.getAttribute('data-status');
      container.querySelectorAll('[data-status]').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      container.querySelector('#save-log').disabled = false;
    });
  });

  container.querySelector('#note').addEventListener('input', (e) => {
    note = e.target.value;
  });

  container.querySelector('#save-log').addEventListener('click', async () => {
    const errorEl = container.querySelector('#log-error');
    const savedEl = container.querySelector('#saved-msg');
    errorEl.style.display = 'none';
    try {
      const input = isNew ? { media, status, rating, note } : { mediaItemId, status, rating, note };
      const log = await LogsApi.create(input);
      if (isNew) {
        // Navigating replaces this view entirely, so the transient "saved" message would
        // never be seen here — landing on the stable item URL is the confirmation instead.
        navigate(`/item/${log.media.id}`);
      } else {
        savedEl.style.display = 'block';
      }
    } catch (err) {
      errorEl.textContent = err.message || "Couldn't save your log.";
      errorEl.style.display = 'block';
    }
  });

  container.querySelector('#write-review').addEventListener('click', () => {
    const qs = isNew
      ? new URLSearchParams({
          type: media.type,
          source: media.source,
          externalId: media.externalId,
          title: media.title,
          creator: media.creator || '',
          year: media.year || '',
          coverUrl: media.coverUrl || '',
        }).toString()
      : new URLSearchParams({ mediaItemId: String(mediaItemId) }).toString();
    navigate(`/write-review?${qs}`);
  });
}

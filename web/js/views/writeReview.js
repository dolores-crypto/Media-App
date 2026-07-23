import { ReviewsApi } from '../api/resources.js';
import { wireStarPicker } from '../components/starRating.js';
import { navigate } from '../router.js';
import { escapeHtml } from '../util.js';

export async function render(container, params, query) {
  const reviewId = query.reviewId ? Number(query.reviewId) : null;
  const mediaItemId = query.mediaItemId ? Number(query.mediaItemId) : null;
  const media = query.type
    ? {
        type: query.type,
        source: query.source,
        externalId: query.externalId,
        title: query.title,
        creator: query.creator || '',
        year: query.year || '',
        coverUrl: query.coverUrl || '',
      }
    : null;

  let existing = null;
  if (reviewId) existing = await ReviewsApi.get(reviewId);

  let rating = existing?.rating ?? null;

  container.innerHTML = `
    <div class="section-heading">Rating</div>
    <div id="rating-picker"></div>
    <div class="section-heading">Title</div>
    <input id="title" type="text" placeholder="Give your review a title" value="${existing ? escapeHtml(existing.title) : ''}" />
    <div class="section-heading">Review</div>
    <textarea id="body" style="min-height:220px" placeholder="Write your thoughts...">${existing ? escapeHtml(existing.body) : ''}</textarea>
    <p class="error" id="error" style="display:none"></p>
    <button class="btn-primary" id="submit" style="margin-top:16px">${existing ? 'Save changes' : 'Publish review'}</button>
  `;

  wireStarPicker(container.querySelector('#rating-picker'), rating, (value) => {
    rating = value;
  });

  container.querySelector('#submit').addEventListener('click', async () => {
    const title = container.querySelector('#title').value.trim();
    const body = container.querySelector('#body').value.trim();
    const errorEl = container.querySelector('#error');
    errorEl.style.display = 'none';
    if (!title || !body) {
      errorEl.textContent = 'Title and review body are both required.';
      errorEl.style.display = 'block';
      return;
    }
    try {
      const review = existing
        ? await ReviewsApi.update(reviewId, { title, body, rating })
        : await ReviewsApi.create({ mediaItemId, media, title, body, rating });
      navigate(`/review/${review.id}`);
    } catch (err) {
      errorEl.textContent = err.message || "Couldn't save your review.";
      errorEl.style.display = 'block';
    }
  });
}

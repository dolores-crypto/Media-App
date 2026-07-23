import { ReviewsApi } from '../api/resources.js';
import { getState } from '../state.js';
import { navigate } from '../router.js';
import { mediaCardHtml } from '../components/mediaCard.js';
import { starsHtml } from '../components/starRating.js';
import { likeButtonHtml } from '../components/likeButton.js';
import { mountCommentsSection } from '../components/commentsSection.js';
import { escapeHtml } from '../util.js';

export async function render(container, params) {
  const reviewId = Number(params.id);
  const review = await ReviewsApi.get(reviewId);
  const { user: me } = getState();
  const isOwner = me?.id === review.user.id;

  container.innerHTML = `
    <a data-nav="/profile/${encodeURIComponent(review.user.username)}" style="cursor:pointer;font-weight:600">
      ${escapeHtml(review.user.displayName)} <span class="person-handle">@${escapeHtml(review.user.username)}</span>
    </a>
    ${review.rating ? `<div style="margin-top:4px">${starsHtml(review.rating)}</div>` : ''}
    <div style="font-size:24px;font-weight:800;margin-top:4px">${escapeHtml(review.title)}</div>
    ${review.media ? mediaCardHtml(review.media, { navHref: `/item/${review.media.id}` }) : ''}
    <p style="font-size:16px;line-height:1.6;margin-top:16px">${escapeHtml(review.body).replace(/\n/g, '<br>')}</p>
    <div style="margin-top:8px">${likeButtonHtml('review', review.id, review.likeCount, review.likedByMe)}</div>
    ${
      isOwner
        ? `<div class="owner-actions">
             <button class="btn-secondary" id="edit-review">Edit</button>
             <button class="btn-secondary" id="delete-review" style="color:var(--danger)">Delete</button>
           </div>`
        : ''
    }
    <div id="comments"></div>
  `;

  if (isOwner) {
    container.querySelector('#edit-review').addEventListener('click', () => {
      navigate(`/write-review?reviewId=${review.id}`);
    });
    container.querySelector('#delete-review').addEventListener('click', async () => {
      if (!confirm('Delete this review? This cannot be undone.')) return;
      await ReviewsApi.remove(review.id);
      history.back();
    });
  }

  await mountCommentsSection(container.querySelector('#comments'), review.id, me?.id);
}

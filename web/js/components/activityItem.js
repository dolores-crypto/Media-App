import { mediaCardHtml } from './mediaCard.js';
import { starsHtml } from './starRating.js';
import { likeButtonHtml } from './likeButton.js';
import { escapeHtml, timeAgo, STATUS_LABELS } from '../util.js';

function authorHtml(user) {
  return `<a data-nav="/profile/${encodeURIComponent(user.username)}" style="cursor:pointer;font-weight:600">${escapeHtml(
    user.displayName
  )} <span class="person-handle">@${escapeHtml(user.username)}</span></a>`;
}

export function activityItemHtml(entry) {
  const item = entry.item;
  if (entry.kind === 'log') {
    return `
      <div class="card">
        ${authorHtml(item.user)}
        <div class="muted" style="font-size:13px;margin-top:4px">${STATUS_LABELS[item.status] ?? item.status}</div>
        ${mediaCardHtml(item.media, { navHref: `/item/${item.media.id}` })}
        ${item.rating ? starsHtml(item.rating) : ''}
        ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ''}
        <div class="footer-row">
          <span class="timestamp">${timeAgo(item.createdAt)}</span>
          ${likeButtonHtml('log', item.id, item.likeCount, item.likedByMe)}
        </div>
      </div>`;
  }

  const review = item;
  const snippet = review.body.length > 220 ? `${review.body.slice(0, 220)}…` : review.body;
  return `
    <div class="card">
      ${authorHtml(review.user)}
      <div class="muted" style="font-size:13px;margin-top:4px">wrote a review</div>
      <div data-nav="/review/${review.id}" style="cursor:pointer">
        <div class="media-title" style="margin-top:4px">${escapeHtml(review.title)}</div>
        <p class="muted">${escapeHtml(snippet)}</p>
      </div>
      ${review.media ? mediaCardHtml(review.media, { navHref: `/item/${review.media.id}` }) : ''}
      ${review.rating ? starsHtml(review.rating) : ''}
      <div class="footer-row">
        <span class="timestamp">${timeAgo(review.createdAt)}${
    review.commentCount > 0 ? ` · ${review.commentCount} comment${review.commentCount === 1 ? '' : 's'}` : ''
  }</span>
        ${likeButtonHtml('review', review.id, review.likeCount, review.likedByMe)}
      </div>
    </div>`;
}

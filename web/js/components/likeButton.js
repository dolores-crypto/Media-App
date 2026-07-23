import { LogsApi, ReviewsApi } from '../api/resources.js';

const APIS = { log: LogsApi, review: ReviewsApi };

export function likeButtonHtml(targetType, targetId, likeCount, likedByMe) {
  return `<button class="like-button ${likedByMe ? 'liked' : ''}" data-like data-like-type="${targetType}" data-like-id="${targetId}" data-liked="${likedByMe}" data-like-count="${likeCount}">
    <span data-like-icon>${likedByMe ? '♥' : '♡'}</span>
    <span class="like-count" data-like-count-label>${likeCount > 0 ? likeCount : ''}</span>
  </button>`;
}

function applyLikeUi(el, liked, count) {
  el.setAttribute('data-liked', String(liked));
  el.setAttribute('data-like-count', String(count));
  el.classList.toggle('liked', liked);
  el.querySelector('[data-like-icon]').textContent = liked ? '♥' : '♡';
  el.querySelector('[data-like-count-label]').textContent = count > 0 ? String(count) : '';
}

export async function handleLikeClick(el) {
  const type = el.getAttribute('data-like-type');
  const id = Number(el.getAttribute('data-like-id'));
  const liked = el.getAttribute('data-liked') === 'true';
  const count = Number(el.getAttribute('data-like-count'));
  const nextLiked = !liked;
  applyLikeUi(el, nextLiked, count + (nextLiked ? 1 : -1));
  try {
    const api = APIS[type];
    const result = nextLiked ? await api.like(id) : await api.unlike(id);
    applyLikeUi(el, result.likedByMe, result.likeCount);
  } catch {
    applyLikeUi(el, liked, count);
  }
}

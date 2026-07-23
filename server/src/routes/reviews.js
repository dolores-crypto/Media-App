import { HttpError } from '../http.js';
import { requireAuth } from '../auth.js';
import { resolveMediaRef } from '../mediaRef.js';
import {
  createReview,
  getReview,
  updateReview,
  deleteReview,
  publicReview,
  publicMediaItem,
  publicUser,
  getUserById,
  getMediaItem,
} from '../store.js';

function validateRating(rating) {
  if (rating === undefined || rating === null) return null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Rating must be an integer from 1 to 5');
  }
  return rating;
}

function hydrate(db, review) {
  return publicReview(review, {
    user: publicUser(getUserById(db, review.user_id)),
    media: review.media_item_id ? publicMediaItem(getMediaItem(db, review.media_item_id)) : null,
  });
}

export function registerReviewRoutes(router, db, secret) {
  router.post('/api/reviews', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const { title, body, rating, mediaItemId, media } = ctx.body;
    if (!title || !title.trim()) throw new HttpError(400, 'Title is required');
    if (!body || !body.trim()) throw new HttpError(400, 'Review body is required');
    const item = (mediaItemId || media) ? resolveMediaRef(db, { mediaItemId, media }) : null;
    const review = createReview(db, {
      userId: user.id,
      mediaItemId: item?.id ?? null,
      title: title.trim(),
      body,
      rating: validateRating(rating),
    });
    return { status: 201, body: hydrate(db, review) };
  });

  router.get('/api/reviews/:id', (ctx) => {
    const review = getReview(db, Number(ctx.params.id));
    if (!review) throw new HttpError(404, 'Review not found');
    return { body: hydrate(db, review) };
  });

  router.patch('/api/reviews/:id', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const existing = getReview(db, Number(ctx.params.id));
    if (!existing) throw new HttpError(404, 'Review not found');
    if (existing.user_id !== user.id) throw new HttpError(403, 'You can only edit your own reviews');
    const { title, body, rating } = ctx.body;
    const review = updateReview(db, existing.id, {
      title,
      body,
      rating: rating === undefined ? undefined : validateRating(rating),
    });
    return { body: hydrate(db, review) };
  });

  router.delete('/api/reviews/:id', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const existing = getReview(db, Number(ctx.params.id));
    if (!existing) throw new HttpError(404, 'Review not found');
    if (existing.user_id !== user.id) throw new HttpError(403, 'You can only delete your own reviews');
    deleteReview(db, existing.id);
    return { status: 204, body: null };
  });
}

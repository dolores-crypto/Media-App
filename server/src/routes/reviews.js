import { HttpError } from '../http.js';
import { requireAuth, optionalAuth } from '../auth.js';
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
  likeTarget,
  unlikeTarget,
  likeMeta,
  countComments,
  createComment,
  listCommentsForReview,
  publicComment,
} from '../store.js';

function validateRating(rating) {
  if (rating === undefined || rating === null) return null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Rating must be an integer from 1 to 5');
  }
  return rating;
}

function hydrate(db, review, viewerId) {
  return publicReview(review, {
    user: publicUser(getUserById(db, review.user_id)),
    media: review.media_item_id ? publicMediaItem(getMediaItem(db, review.media_item_id)) : null,
    commentCount: countComments(db, review.id),
    ...likeMeta(db, 'review', review.id, viewerId),
  });
}

function requireReview(db, id) {
  const review = getReview(db, id);
  if (!review) throw new HttpError(404, 'Review not found');
  return review;
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
    return { status: 201, body: hydrate(db, review, user.id) };
  });

  router.get('/api/reviews/:id', (ctx) => {
    const review = requireReview(db, Number(ctx.params.id));
    const viewer = optionalAuth(ctx, db, secret);
    return { body: hydrate(db, review, viewer?.id) };
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
    return { body: hydrate(db, review, user.id) };
  });

  router.delete('/api/reviews/:id', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const existing = getReview(db, Number(ctx.params.id));
    if (!existing) throw new HttpError(404, 'Review not found');
    if (existing.user_id !== user.id) throw new HttpError(403, 'You can only delete your own reviews');
    deleteReview(db, existing.id);
    return { status: 204, body: null };
  });

  router.post('/api/reviews/:id/like', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const review = requireReview(db, Number(ctx.params.id));
    likeTarget(db, user.id, 'review', review.id);
    return { status: 201, body: likeMeta(db, 'review', review.id, user.id) };
  });

  router.delete('/api/reviews/:id/like', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const review = requireReview(db, Number(ctx.params.id));
    unlikeTarget(db, user.id, 'review', review.id);
    return { body: likeMeta(db, 'review', review.id, user.id) };
  });

  router.post('/api/reviews/:id/comments', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const review = requireReview(db, Number(ctx.params.id));
    const { body } = ctx.body;
    if (!body || !body.trim()) throw new HttpError(400, 'Comment body is required');
    const comment = createComment(db, { userId: user.id, reviewId: review.id, body: body.trim() });
    return { status: 201, body: publicComment(comment, { user: publicUser(user) }) };
  });

  router.get('/api/reviews/:id/comments', (ctx) => {
    const review = requireReview(db, Number(ctx.params.id));
    const comments = listCommentsForReview(db, review.id);
    return {
      body: comments.map((comment) => publicComment(comment, { user: publicUser(getUserById(db, comment.user_id)) })),
    };
  });
}

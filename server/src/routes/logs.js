import { HttpError } from '../http.js';
import { requireAuth } from '../auth.js';
import { resolveMediaRef } from '../mediaRef.js';
import {
  createLog,
  getLog,
  updateLog,
  deleteLog,
  isValidLogStatus,
  publicLog,
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

function hydrate(db, log) {
  return publicLog(log, {
    user: publicUser(getUserById(db, log.user_id)),
    media: publicMediaItem(getMediaItem(db, log.media_item_id)),
  });
}

export function registerLogRoutes(router, db, secret) {
  router.post('/api/logs', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const { status, rating, note, mediaItemId, media } = ctx.body;
    if (!isValidLogStatus(status)) {
      throw new HttpError(400, 'status must be one of want, in_progress, finished, dropped');
    }
    const item = resolveMediaRef(db, { mediaItemId, media });
    const log = createLog(db, {
      userId: user.id,
      mediaItemId: item.id,
      status,
      rating: validateRating(rating),
      note,
    });
    return { status: 201, body: hydrate(db, log) };
  });

  router.get('/api/logs/:id', (ctx) => {
    const log = getLog(db, Number(ctx.params.id));
    if (!log) throw new HttpError(404, 'Log not found');
    return { body: hydrate(db, log) };
  });

  router.patch('/api/logs/:id', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const existing = getLog(db, Number(ctx.params.id));
    if (!existing) throw new HttpError(404, 'Log not found');
    if (existing.user_id !== user.id) throw new HttpError(403, 'You can only edit your own logs');
    const { status, rating, note } = ctx.body;
    if (status !== undefined && !isValidLogStatus(status)) {
      throw new HttpError(400, 'status must be one of want, in_progress, finished, dropped');
    }
    const log = updateLog(db, existing.id, {
      status,
      rating: rating === undefined ? undefined : validateRating(rating),
      note,
    });
    return { body: hydrate(db, log) };
  });

  router.delete('/api/logs/:id', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const existing = getLog(db, Number(ctx.params.id));
    if (!existing) throw new HttpError(404, 'Log not found');
    if (existing.user_id !== user.id) throw new HttpError(403, 'You can only delete your own logs');
    deleteLog(db, existing.id);
    return { status: 204, body: null };
  });
}

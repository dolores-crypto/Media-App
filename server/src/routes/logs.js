import { HttpError } from '../http.js';
import { requireAuth, optionalAuth } from '../auth.js';
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
  likeTarget,
  unlikeTarget,
  likeMeta,
} from '../store.js';
import { notifyUser } from '../notify.js';

function validateRating(rating) {
  if (rating === undefined || rating === null) return null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Rating must be an integer from 1 to 5');
  }
  return rating;
}

function hydrate(db, log, viewerId) {
  return publicLog(log, {
    user: publicUser(getUserById(db, log.user_id)),
    media: publicMediaItem(getMediaItem(db, log.media_item_id)),
    ...likeMeta(db, 'log', log.id, viewerId),
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
    return { status: 201, body: hydrate(db, log, user.id) };
  });

  router.get('/api/logs/:id', (ctx) => {
    const log = getLog(db, Number(ctx.params.id));
    if (!log) throw new HttpError(404, 'Log not found');
    const viewer = optionalAuth(ctx, db, secret);
    return { body: hydrate(db, log, viewer?.id) };
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
    return { body: hydrate(db, log, user.id) };
  });

  router.delete('/api/logs/:id', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const existing = getLog(db, Number(ctx.params.id));
    if (!existing) throw new HttpError(404, 'Log not found');
    if (existing.user_id !== user.id) throw new HttpError(403, 'You can only delete your own logs');
    deleteLog(db, existing.id);
    return { status: 204, body: null };
  });

  router.post('/api/logs/:id/like', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const log = getLog(db, Number(ctx.params.id));
    if (!log) throw new HttpError(404, 'Log not found');
    likeTarget(db, user.id, 'log', log.id);
    notifyUser(db, {
      userId: log.user_id,
      actorId: user.id,
      type: 'like',
      targetType: 'log',
      targetId: log.id,
      title: 'New like',
      body: `${user.display_name} liked your log`,
    });
    return { status: 201, body: likeMeta(db, 'log', log.id, user.id) };
  });

  router.delete('/api/logs/:id/like', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const log = getLog(db, Number(ctx.params.id));
    if (!log) throw new HttpError(404, 'Log not found');
    unlikeTarget(db, user.id, 'log', log.id);
    return { body: likeMeta(db, 'log', log.id, user.id) };
  });
}

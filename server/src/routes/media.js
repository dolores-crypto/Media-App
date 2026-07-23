import { HttpError } from '../http.js';
import { optionalAuth } from '../auth.js';
import { searchMedia } from '../mediaProviders.js';
import {
  getMediaItem,
  publicMediaItem,
  mediaStats,
  listLogsForMedia,
  listReviewsForMedia,
  publicLog,
  publicReview,
  getUserById,
  publicUser,
  likeMeta,
  countComments,
} from '../store.js';

export function registerMediaRoutes(router, db, secret) {
  router.get('/api/media/search', async (ctx) => {
    const { type, q } = ctx.query;
    const results = await searchMedia(type, q);
    return { body: results };
  });

  router.get('/api/media/:id', (ctx) => {
    const id = Number(ctx.params.id);
    const item = getMediaItem(db, id);
    if (!item) throw new HttpError(404, 'Media item not found');
    const viewer = optionalAuth(ctx, db, secret);
    const logs = listLogsForMedia(db, id, { limit: 20 }).map((log) =>
      publicLog(log, { user: publicUser(getUserById(db, log.user_id)), ...likeMeta(db, 'log', log.id, viewer?.id) })
    );
    const reviews = listReviewsForMedia(db, id, { limit: 20 }).map((review) =>
      publicReview(review, {
        user: publicUser(getUserById(db, review.user_id)),
        commentCount: countComments(db, review.id),
        ...likeMeta(db, 'review', review.id, viewer?.id),
      })
    );
    return {
      body: {
        ...publicMediaItem(item),
        ...mediaStats(db, id),
        recentLogs: logs,
        reviews,
      },
    };
  });
}

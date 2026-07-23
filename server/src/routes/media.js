import { HttpError } from '../http.js';
import { optionalAuth } from '../auth.js';
import { searchMedia, SUPPORTED_TYPES } from '../mediaProviders.js';
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
  getTrendingMedia,
} from '../store.js';

export function registerMediaRoutes(router, db, secret) {
  router.get('/api/media/search', async (ctx) => {
    const { type, q } = ctx.query;
    const results = await searchMedia(type, q);
    return { body: results };
  });

  // Registered before `/api/media/:id` so "trending" isn't parsed as a media item id.
  router.get('/api/media/trending', (ctx) => {
    const { type } = ctx.query;
    if (type && !SUPPORTED_TYPES.includes(type)) {
      throw new HttpError(400, `Unsupported media type: ${type}. Use one of ${SUPPORTED_TYPES.join(', ')}`);
    }
    let rows = getTrendingMedia(db, { type, days: 30, limit: 20 });
    if (rows.length === 0) {
      rows = getTrendingMedia(db, { type, limit: 20 });
    }
    return {
      body: rows.map((row) => ({ ...publicMediaItem(row), ...mediaStats(db, row.id), activityCount: row.activity_count })),
    };
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

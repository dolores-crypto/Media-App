import { HttpError } from '../http.js';
import { searchMedia } from '../mediaProviders.js';
import { getMediaItem, publicMediaItem, mediaStats, listLogsForMedia, listReviewsForMedia, publicLog, publicReview, getUserById, publicUser } from '../store.js';

export function registerMediaRoutes(router, db) {
  router.get('/api/media/search', async (ctx) => {
    const { type, q } = ctx.query;
    const results = await searchMedia(type, q);
    return { body: results };
  });

  router.get('/api/media/:id', (ctx) => {
    const id = Number(ctx.params.id);
    const item = getMediaItem(db, id);
    if (!item) throw new HttpError(404, 'Media item not found');
    const logs = listLogsForMedia(db, id, { limit: 20 }).map((log) =>
      publicLog(log, { user: publicUser(getUserById(db, log.user_id)) })
    );
    const reviews = listReviewsForMedia(db, id, { limit: 20 }).map((review) =>
      publicReview(review, { user: publicUser(getUserById(db, review.user_id)) })
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

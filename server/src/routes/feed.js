import { requireAuth } from '../auth.js';
import {
  getFeed,
  getLog,
  getReview,
  publicLog,
  publicReview,
  publicMediaItem,
  publicUser,
  getUserById,
  getMediaItem,
} from '../store.js';

export function registerFeedRoutes(router, db, secret) {
  router.get('/api/feed', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const rows = getFeed(db, user.id, { before: ctx.query.before, limit: 30 });
    const items = rows.map((row) => {
      const author = publicUser(getUserById(db, row.user_id));
      const media = row.media_item_id ? publicMediaItem(getMediaItem(db, row.media_item_id)) : null;
      if (row.kind === 'log') {
        return { kind: 'log', item: publicLog(getLog(db, row.id), { user: author, media }) };
      }
      return { kind: 'review', item: publicReview(getReview(db, row.id), { user: author, media }) };
    });
    return { body: items };
  });
}

import { requireAuth } from '../auth.js';
import {
  listNotifications,
  countUnreadNotifications,
  markAllNotificationsRead,
  getUserById,
  publicUser,
  getLog,
  getReview,
} from '../store.js';

function hydrateNotification(db, n) {
  const actor = publicUser(getUserById(db, n.actor_id));
  let message = '';
  let target = null;

  if (n.type === 'follow') {
    message = `${actor.displayName} started following you`;
  } else if (n.type === 'like' && n.target_type === 'log') {
    const log = getLog(db, n.target_id);
    message = `${actor.displayName} liked your log`;
    target = log ? { kind: 'log', logId: log.id, mediaItemId: log.media_item_id } : null;
  } else if (n.type === 'like' && n.target_type === 'review') {
    const review = getReview(db, n.target_id);
    message = `${actor.displayName} liked your review`;
    target = review ? { kind: 'review', reviewId: review.id, title: review.title } : null;
  } else if (n.type === 'comment') {
    const review = getReview(db, n.target_id);
    message = `${actor.displayName} commented on your review`;
    target = review ? { kind: 'review', reviewId: review.id, title: review.title } : null;
  }

  return {
    id: n.id,
    type: n.type,
    message,
    actor,
    target,
    read: !!n.read,
    createdAt: n.created_at,
  };
}

export function registerNotificationRoutes(router, db, secret) {
  router.get('/api/notifications', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const rows = listNotifications(db, user.id, { before: ctx.query.before, limit: 30 });
    return { body: rows.map((n) => hydrateNotification(db, n)) };
  });

  router.get('/api/notifications/unread-count', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    return { body: { count: countUnreadNotifications(db, user.id) } };
  });

  router.post('/api/notifications/read', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    markAllNotificationsRead(db, user.id);
    return { body: { read: true } };
  });
}

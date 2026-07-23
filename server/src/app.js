import { openDb } from './db.js';
import { createRouter, createRequestListener } from './http.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerUserRoutes } from './routes/users.js';
import { registerMediaRoutes } from './routes/media.js';
import { registerLogRoutes } from './routes/logs.js';
import { registerReviewRoutes } from './routes/reviews.js';
import { registerFeedRoutes } from './routes/feed.js';

export function createApp({ dbPath = ':memory:', secret }) {
  if (!secret) throw new Error('createApp requires an auth secret');
  const db = openDb(dbPath);
  const router = createRouter();

  router.get('/api/health', () => ({ body: { ok: true } }));

  registerAuthRoutes(router, db, secret);
  registerUserRoutes(router, db, secret);
  registerMediaRoutes(router, db);
  registerLogRoutes(router, db, secret);
  registerReviewRoutes(router, db, secret);
  registerFeedRoutes(router, db, secret);

  const listener = createRequestListener(router, {
    onError: (err) => console.error('Unhandled error:', err),
  });

  return { db, listener };
}

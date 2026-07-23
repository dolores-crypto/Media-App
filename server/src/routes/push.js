import { HttpError } from '../http.js';
import { requireAuth } from '../auth.js';
import { registerPushToken, unregisterPushToken } from '../store.js';

export function registerPushRoutes(router, db, secret) {
  router.post('/api/me/push-tokens', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const { token } = ctx.body;
    if (!token || typeof token !== 'string') throw new HttpError(400, 'token is required');
    registerPushToken(db, user.id, token);
    return { status: 201, body: { registered: true } };
  });

  router.delete('/api/me/push-tokens', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const token = ctx.query.token;
    if (!token) throw new HttpError(400, 'token query parameter is required');
    unregisterPushToken(db, user.id, token);
    return { body: { registered: false } };
  });
}

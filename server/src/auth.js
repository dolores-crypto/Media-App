import { HttpError } from './http.js';
import { verifyToken } from './crypto.js';
import { getUserById } from './store.js';

export function requireAuth(ctx, db, secret) {
  const header = ctx.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Missing or malformed Authorization header');
  }
  const payload = verifyToken(token, secret);
  if (!payload) {
    throw new HttpError(401, 'Invalid or expired token');
  }
  const user = getUserById(db, payload.sub);
  if (!user) {
    throw new HttpError(401, 'User no longer exists');
  }
  return user;
}

export function optionalAuth(ctx, db, secret) {
  try {
    return requireAuth(ctx, db, secret);
  } catch {
    return null;
  }
}

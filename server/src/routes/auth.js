import { HttpError } from '../http.js';
import { hashPassword, verifyPassword, signToken } from '../crypto.js';
import { createUser, getUserByEmail, getUserByUsername, updateUser, publicUser } from '../store.js';
import { requireAuth } from '../auth.js';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function issueToken(user, secret) {
  return signToken({ sub: user.id }, secret);
}

export function registerAuthRoutes(router, db, secret) {
  router.post('/api/auth/register', (ctx) => {
    const { username, email, password, displayName } = ctx.body;
    if (!username || !USERNAME_RE.test(username)) {
      throw new HttpError(400, 'Username must be 3-20 characters: letters, numbers, underscore');
    }
    if (!email || !email.includes('@')) {
      throw new HttpError(400, 'A valid email is required');
    }
    if (!password || password.length < 8) {
      throw new HttpError(400, 'Password must be at least 8 characters');
    }
    if (getUserByUsername(db, username)) {
      throw new HttpError(409, 'Username is already taken');
    }
    if (getUserByEmail(db, email)) {
      throw new HttpError(409, 'Email is already registered');
    }
    const user = createUser(db, {
      username,
      email,
      passwordHash: hashPassword(password),
      displayName: displayName?.trim() || username,
    });
    return { status: 201, body: { token: issueToken(user, secret), user: publicUser(user) } };
  });

  router.post('/api/auth/login', (ctx) => {
    const { email, password } = ctx.body;
    const user = email && getUserByEmail(db, email);
    if (!user || !verifyPassword(password || '', user.password_hash)) {
      throw new HttpError(401, 'Invalid email or password');
    }
    return { body: { token: issueToken(user, secret), user: publicUser(user) } };
  });

  router.get('/api/me', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    return { body: publicUser(user) };
  });

  router.patch('/api/me', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const { displayName, bio, avatarUrl } = ctx.body;
    const updated = updateUser(db, user.id, { displayName, bio, avatarUrl });
    return { body: publicUser(updated) };
  });
}

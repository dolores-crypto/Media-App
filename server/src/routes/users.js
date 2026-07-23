import { HttpError } from '../http.js';
import { requireAuth, optionalAuth } from '../auth.js';
import {
  getUserByUsername,
  publicUser,
  countFollowers,
  countFollowing,
  isFollowing,
  follow,
  unfollow,
  listFollowers,
  listFollowing,
  listLogsByUser,
  listReviewsByUser,
  getMediaItem,
  publicMediaItem,
  publicLog,
  publicReview,
} from '../store.js';

function requireProfile(db, username) {
  const user = getUserByUsername(db, username);
  if (!user) throw new HttpError(404, 'User not found');
  return user;
}

export function registerUserRoutes(router, db, secret) {
  router.get('/api/users/:username', (ctx) => {
    const profile = requireProfile(db, ctx.params.username);
    const viewer = optionalAuth(ctx, db, secret);
    return {
      body: publicUser(profile, {
        followerCount: countFollowers(db, profile.id),
        followingCount: countFollowing(db, profile.id),
        isFollowedByMe: viewer ? isFollowing(db, viewer.id, profile.id) : false,
        isMe: viewer ? viewer.id === profile.id : false,
      }),
    };
  });

  router.post('/api/users/:username/follow', (ctx) => {
    const viewer = requireAuth(ctx, db, secret);
    const target = requireProfile(db, ctx.params.username);
    if (target.id === viewer.id) throw new HttpError(400, 'You cannot follow yourself');
    follow(db, viewer.id, target.id);
    return { status: 201, body: { following: true } };
  });

  router.delete('/api/users/:username/follow', (ctx) => {
    const viewer = requireAuth(ctx, db, secret);
    const target = requireProfile(db, ctx.params.username);
    unfollow(db, viewer.id, target.id);
    return { body: { following: false } };
  });

  router.get('/api/users/:username/followers', (ctx) => {
    const profile = requireProfile(db, ctx.params.username);
    return { body: listFollowers(db, profile.id).map((u) => publicUser(u)) };
  });

  router.get('/api/users/:username/following', (ctx) => {
    const profile = requireProfile(db, ctx.params.username);
    return { body: listFollowing(db, profile.id).map((u) => publicUser(u)) };
  });

  router.get('/api/users/:username/logs', (ctx) => {
    const profile = requireProfile(db, ctx.params.username);
    const logs = listLogsByUser(db, profile.id, { before: ctx.query.before });
    return {
      body: logs.map((log) =>
        publicLog(log, { user: publicUser(profile), media: publicMediaItem(getMediaItem(db, log.media_item_id)) })
      ),
    };
  });

  router.get('/api/users/:username/reviews', (ctx) => {
    const profile = requireProfile(db, ctx.params.username);
    const reviews = listReviewsByUser(db, profile.id, { before: ctx.query.before });
    return {
      body: reviews.map((review) =>
        publicReview(review, {
          user: publicUser(profile),
          media: review.media_item_id ? publicMediaItem(getMediaItem(db, review.media_item_id)) : null,
        })
      ),
    };
  });
}

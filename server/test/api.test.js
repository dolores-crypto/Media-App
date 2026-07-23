import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';
import { listPushTokensForUser } from '../src/store.js';

const SECRET = 'test-secret';
let server;
let baseUrl;
let db;

before(async () => {
  const app = createApp({ dbPath: ':memory:', secret: SECRET });
  db = app.db;
  server = createServer(app.listener);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { status: res.status, json };
}

async function registerUser(username) {
  const { status, json } = await api('/api/auth/register', {
    method: 'POST',
    body: { username, email: `${username}@example.com`, password: 'password123', displayName: username },
  });
  assert.equal(status, 201);
  return json; // { token, user }
}

const MEDIA_A = {
  type: 'book',
  source: 'manual',
  externalId: 'test-book-1',
  title: 'Test Driven Fiction',
  creator: 'Ada Lovelace',
  year: '2020',
  coverUrl: '',
};

test('register rejects weak input and duplicate username/email', async () => {
  const weak = await api('/api/auth/register', {
    method: 'POST',
    body: { username: 'ab', email: 'a@b.com', password: 'short', displayName: 'A' },
  });
  assert.equal(weak.status, 400);

  await registerUser('alice');

  const dupUsername = await api('/api/auth/register', {
    method: 'POST',
    body: { username: 'alice', email: 'other@example.com', password: 'password123' },
  });
  assert.equal(dupUsername.status, 409);

  const dupEmail = await api('/api/auth/register', {
    method: 'POST',
    body: { username: 'alice2', email: 'alice@example.com', password: 'password123' },
  });
  assert.equal(dupEmail.status, 409);
});

test('login succeeds with correct password and fails otherwise', async () => {
  await registerUser('bob');
  const ok = await api('/api/auth/login', { method: 'POST', body: { email: 'bob@example.com', password: 'password123' } });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);

  const bad = await api('/api/auth/login', { method: 'POST', body: { email: 'bob@example.com', password: 'wrongpass' } });
  assert.equal(bad.status, 401);
});

test('GET /api/me requires auth and returns profile', async () => {
  const noAuth = await api('/api/me');
  assert.equal(noAuth.status, 401);

  const { token, user } = await registerUser('carol');
  const me = await api('/api/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.json.username, user.username);
});

test('follow graph: follow, unfollow, self-follow rejected, counts and lists correct', async () => {
  const dave = await registerUser('dave');
  const erin = await registerUser('erin');

  const selfFollow = await api(`/api/users/dave/follow`, { method: 'POST', token: dave.token });
  assert.equal(selfFollow.status, 400);

  const follow = await api(`/api/users/erin/follow`, { method: 'POST', token: dave.token });
  assert.equal(follow.status, 201);

  const profile = await api('/api/users/erin', { token: dave.token });
  assert.equal(profile.json.isFollowedByMe, true);
  assert.equal(profile.json.followerCount, 1);

  const followers = await api('/api/users/erin/followers');
  assert.equal(followers.json.length, 1);
  assert.equal(followers.json[0].username, 'dave');

  const unfollow = await api(`/api/users/erin/follow`, { method: 'DELETE', token: dave.token });
  assert.equal(unfollow.status, 200);

  const profileAfter = await api('/api/users/erin', { token: dave.token });
  assert.equal(profileAfter.json.isFollowedByMe, false);
});

test('logs: create, read, owner-only update/delete', async () => {
  const frank = await registerUser('frank');
  const grace = await registerUser('grace');

  const created = await api('/api/logs', {
    method: 'POST',
    token: frank.token,
    body: { media: MEDIA_A, status: 'finished', rating: 5, note: 'Loved it' },
  });
  assert.equal(created.status, 201);
  assert.equal(created.json.status, 'finished');
  assert.equal(created.json.media.title, MEDIA_A.title);
  const logId = created.json.id;

  const badStatus = await api('/api/logs', {
    method: 'POST',
    token: frank.token,
    body: { media: MEDIA_A, status: 'nonsense' },
  });
  assert.equal(badStatus.status, 400);

  const fetched = await api(`/api/logs/${logId}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.json.rating, 5);

  const forbiddenEdit = await api(`/api/logs/${logId}`, {
    method: 'PATCH',
    token: grace.token,
    body: { rating: 1 },
  });
  assert.equal(forbiddenEdit.status, 403);

  const edit = await api(`/api/logs/${logId}`, {
    method: 'PATCH',
    token: frank.token,
    body: { status: 'in_progress', rating: 3 },
  });
  assert.equal(edit.status, 200);
  assert.equal(edit.json.status, 'in_progress');
  assert.equal(edit.json.rating, 3);

  const forbiddenDelete = await api(`/api/logs/${logId}`, { method: 'DELETE', token: grace.token });
  assert.equal(forbiddenDelete.status, 403);

  const del = await api(`/api/logs/${logId}`, { method: 'DELETE', token: frank.token });
  assert.equal(del.status, 204);
});

test('reviews: create tied to media and standalone, ownership enforced', async () => {
  const heidi = await registerUser('heidi');

  const tied = await api('/api/reviews', {
    method: 'POST',
    token: heidi.token,
    body: { media: { ...MEDIA_A, externalId: 'test-book-2' }, title: 'A great read', body: 'Full essay body here.', rating: 4 },
  });
  assert.equal(tied.status, 201);
  assert.ok(tied.json.media);

  const standalone = await api('/api/reviews', {
    method: 'POST',
    token: heidi.token,
    body: { title: 'Newsletter thoughts', body: 'No specific media for this one.' },
  });
  assert.equal(standalone.status, 201);
  assert.equal(standalone.json.media, null);

  const missingBody = await api('/api/reviews', {
    method: 'POST',
    token: heidi.token,
    body: { title: 'No body' },
  });
  assert.equal(missingBody.status, 400);

  const ivan = await registerUser('ivan');
  const forbidden = await api(`/api/reviews/${tied.json.id}`, {
    method: 'PATCH',
    token: ivan.token,
    body: { title: 'Hijacked' },
  });
  assert.equal(forbidden.status, 403);
});

test('feed shows own and followed users activity, newest first', async () => {
  const judy = await registerUser('judy');
  const kevin = await registerUser('kevin');
  await api('/api/users/kevin/follow', { method: 'POST', token: judy.token });

  await api('/api/logs', {
    method: 'POST',
    token: kevin.token,
    body: { media: { ...MEDIA_A, externalId: 'test-book-3' }, status: 'want' },
  });
  await api('/api/reviews', {
    method: 'POST',
    token: kevin.token,
    body: { media: { ...MEDIA_A, externalId: 'test-book-4' }, title: 'Kevin review', body: 'Body text' },
  });
  await api('/api/logs', {
    method: 'POST',
    token: judy.token,
    body: { media: { ...MEDIA_A, externalId: 'test-book-5' }, status: 'want' },
  });

  const feed = await api('/api/feed', { token: judy.token });
  assert.equal(feed.status, 200);
  const usernames = feed.json.map((entry) => entry.item.user.username);
  assert.ok(usernames.includes('judy'));
  assert.ok(usernames.includes('kevin'));

  const strangerFeed = await api('/api/feed', { token: (await registerUser('leo')).token });
  assert.equal(strangerFeed.json.length, 0);
});

test('media search validates type and query before hitting upstream', async () => {
  const badType = await api('/api/media/search?type=vinyl&q=test');
  assert.equal(badType.status, 400);

  const missingQuery = await api('/api/media/search?type=book&q=');
  assert.equal(missingQuery.status, 400);
});

test('user search matches username or display name substrings', async () => {
  await registerUser('marguerite');
  await registerUser('margarethe');
  await registerUser('unrelated_zz');

  const results = await api('/api/users/search?q=marg');
  assert.equal(results.status, 200);
  const names = results.json.map((u) => u.username);
  assert.ok(names.includes('marguerite'));
  assert.ok(names.includes('margarethe'));
  assert.ok(!names.includes('unrelated_zz'));

  const empty = await api('/api/users/search?q=');
  assert.deepEqual(empty.json, []);
});

test('likes: toggle on a log and a review, counts and likedByMe reflect the viewer', async () => {
  const mallory = await registerUser('mallory');
  const nathan = await registerUser('nathan');

  const log = await api('/api/logs', {
    method: 'POST',
    token: mallory.token,
    body: { media: { ...MEDIA_A, externalId: 'like-log-1' }, status: 'finished' },
  });

  const likeNoAuth = await api(`/api/logs/${log.json.id}/like`, { method: 'POST' });
  assert.equal(likeNoAuth.status, 401);

  const like = await api(`/api/logs/${log.json.id}/like`, { method: 'POST', token: nathan.token });
  assert.equal(like.status, 201);
  assert.equal(like.json.likeCount, 1);
  assert.equal(like.json.likedByMe, true);

  const fetched = await api(`/api/logs/${log.json.id}`, { token: nathan.token });
  assert.equal(fetched.json.likeCount, 1);
  assert.equal(fetched.json.likedByMe, true);

  const fetchedAsOther = await api(`/api/logs/${log.json.id}`, { token: mallory.token });
  assert.equal(fetchedAsOther.json.likeCount, 1);
  assert.equal(fetchedAsOther.json.likedByMe, false);

  const unlike = await api(`/api/logs/${log.json.id}/like`, { method: 'DELETE', token: nathan.token });
  assert.equal(unlike.status, 200);
  assert.equal(unlike.json.likeCount, 0);

  const review = await api('/api/reviews', {
    method: 'POST',
    token: mallory.token,
    body: { media: { ...MEDIA_A, externalId: 'like-review-1' }, title: 'Liked review', body: 'body' },
  });
  const likeReview = await api(`/api/reviews/${review.json.id}/like`, { method: 'POST', token: nathan.token });
  assert.equal(likeReview.json.likeCount, 1);

  const likeReviewAgain = await api(`/api/reviews/${review.json.id}/like`, { method: 'POST', token: nathan.token });
  assert.equal(likeReviewAgain.json.likeCount, 1, 'liking twice is idempotent');
});

test('comments: create, list, owner-only delete', async () => {
  const oscar = await registerUser('oscar');
  const peggy = await registerUser('peggy');

  const review = await api('/api/reviews', {
    method: 'POST',
    token: oscar.token,
    body: { title: 'Discuss this', body: 'body text' },
  });

  const missingBody = await api(`/api/reviews/${review.json.id}/comments`, {
    method: 'POST',
    token: peggy.token,
    body: {},
  });
  assert.equal(missingBody.status, 400);

  const comment = await api(`/api/reviews/${review.json.id}/comments`, {
    method: 'POST',
    token: peggy.token,
    body: { body: 'Great point!' },
  });
  assert.equal(comment.status, 201);
  assert.equal(comment.json.user.username, 'peggy');

  const list = await api(`/api/reviews/${review.json.id}/comments`);
  assert.equal(list.json.length, 1);
  assert.equal(list.json[0].body, 'Great point!');

  const reviewDetail = await api(`/api/reviews/${review.json.id}`);
  assert.equal(reviewDetail.json.commentCount, 1);

  const forbiddenDelete = await api(`/api/comments/${comment.json.id}`, { method: 'DELETE', token: oscar.token });
  assert.equal(forbiddenDelete.status, 403);

  const del = await api(`/api/comments/${comment.json.id}`, { method: 'DELETE', token: peggy.token });
  assert.equal(del.status, 204);

  const listAfter = await api(`/api/reviews/${review.json.id}/comments`);
  assert.equal(listAfter.json.length, 0);
});

test('trending media ranks by activity and supports a type filter', async () => {
  const quinn = await registerUser('quinn');
  const rachel = await registerUser('rachel');

  const popular = { ...MEDIA_A, externalId: 'trend-popular' };
  const rare = { type: 'movie', source: 'manual', externalId: 'trend-rare', title: 'Rare Trending Movie', creator: '', year: '', coverUrl: '' };

  await api('/api/logs', { method: 'POST', token: quinn.token, body: { media: popular, status: 'finished' } });
  await api('/api/logs', { method: 'POST', token: rachel.token, body: { media: popular, status: 'want' } });
  await api('/api/logs', { method: 'POST', token: rachel.token, body: { media: rare, status: 'want' } });

  const trending = await api('/api/media/trending');
  assert.equal(trending.status, 200);
  const titles = trending.json.map((m) => m.title);
  assert.ok(titles.includes(popular.title));
  assert.ok(titles.includes(rare.title));
  assert.ok(titles.indexOf(popular.title) < titles.indexOf(rare.title), 'busier item ranks first');

  const filtered = await api('/api/media/trending?type=movie');
  assert.equal(filtered.status, 200);
  assert.ok(filtered.json.every((m) => m.type === 'movie'));
  assert.ok(filtered.json.some((m) => m.title === rare.title));

  const badType = await api('/api/media/trending?type=vinyl');
  assert.equal(badType.status, 400);
});

test('suggested users excludes self and already-followed, ranks by follower count', async () => {
  const sam = await registerUser('sam');
  const tara = await registerUser('tara');
  const uma = await registerUser('uma');
  const vince = await registerUser('vince');

  await api('/api/users/tara/follow', { method: 'POST', token: uma.token });
  await api('/api/users/uma/follow', { method: 'POST', token: sam.token });

  const noAuth = await api('/api/users/suggested');
  assert.equal(noAuth.status, 401);

  const suggestions = await api('/api/users/suggested', { token: sam.token });
  assert.equal(suggestions.status, 200);
  const usernames = suggestions.json.map((u) => u.username);
  assert.ok(!usernames.includes('sam'), 'excludes self');
  assert.ok(!usernames.includes('uma'), 'excludes already-followed');
  assert.ok(usernames.includes('tara'));
  assert.ok(usernames.includes('vince'));
  assert.ok(usernames.indexOf('tara') < usernames.indexOf('vince'), 'more-followed user ranks first');
});

test('notifications: follow, like, and comment each notify the recipient (never the actor)', async () => {
  const wendy = await registerUser('wendy');
  const xavier = await registerUser('xavier');

  const initialUnread = await api('/api/notifications/unread-count', { token: wendy.token });
  assert.equal(initialUnread.json.count, 0);

  await api('/api/users/wendy/follow', { method: 'POST', token: xavier.token });

  const afterFollow = await api('/api/notifications', { token: wendy.token });
  assert.equal(afterFollow.json.length, 1);
  assert.equal(afterFollow.json[0].type, 'follow');
  assert.equal(afterFollow.json[0].actor.username, 'xavier');
  assert.equal(afterFollow.json[0].read, false);

  const unreadAfterFollow = await api('/api/notifications/unread-count', { token: wendy.token });
  assert.equal(unreadAfterFollow.json.count, 1);

  const review = await api('/api/reviews', {
    method: 'POST',
    token: wendy.token,
    body: { title: 'Notify me', body: 'body text' },
  });

  // Liking your own review must not notify yourself.
  await api(`/api/reviews/${review.json.id}/like`, { method: 'POST', token: wendy.token });
  const afterSelfLike = await api('/api/notifications', { token: wendy.token });
  assert.equal(afterSelfLike.json.length, 1, 'self-like produced no notification');

  await api(`/api/reviews/${review.json.id}/like`, { method: 'POST', token: xavier.token });
  await api(`/api/reviews/${review.json.id}/comments`, {
    method: 'POST',
    token: xavier.token,
    body: { body: 'Nice review!' },
  });

  const afterActivity = await api('/api/notifications', { token: wendy.token });
  assert.equal(afterActivity.json.length, 3);
  const types = afterActivity.json.map((n) => n.type);
  assert.ok(types.includes('like'));
  assert.ok(types.includes('comment'));
  const commentNotification = afterActivity.json.find((n) => n.type === 'comment');
  assert.equal(commentNotification.target.kind, 'review');
  assert.equal(commentNotification.target.reviewId, review.json.id);

  const markRead = await api('/api/notifications/read', { method: 'POST', token: wendy.token });
  assert.equal(markRead.status, 200);
  const unreadAfterMarkRead = await api('/api/notifications/unread-count', { token: wendy.token });
  assert.equal(unreadAfterMarkRead.json.count, 0);

  const noAuth = await api('/api/notifications');
  assert.equal(noAuth.status, 401);
});

test('push tokens: register requires a token, unregister is scoped to the owning user', async () => {
  const yusuf = await registerUser('yusuf');
  const zara = await registerUser('zara');

  const missingToken = await api('/api/me/push-tokens', { method: 'POST', token: yusuf.token, body: {} });
  assert.equal(missingToken.status, 400);

  const register = await api('/api/me/push-tokens', {
    method: 'POST',
    token: yusuf.token,
    body: { token: 'ExponentPushToken[test-token-1]' },
  });
  assert.equal(register.status, 201);

  const missingQueryParam = await api('/api/me/push-tokens', { method: 'DELETE', token: yusuf.token });
  assert.equal(missingQueryParam.status, 400);

  // zara can't delete yusuf's token by guessing it; the row survives untouched.
  const wrongOwnerDelete = await api(
    `/api/me/push-tokens?token=${encodeURIComponent('ExponentPushToken[test-token-1]')}`,
    { method: 'DELETE', token: zara.token }
  );
  assert.equal(wrongOwnerDelete.status, 200);
  assert.equal(listPushTokensForUser(db, yusuf.user.id).length, 1, "another user's delete request must not remove it");

  const ownerDelete = await api(
    `/api/me/push-tokens?token=${encodeURIComponent('ExponentPushToken[test-token-1]')}`,
    { method: 'DELETE', token: yusuf.token }
  );
  assert.equal(ownerDelete.status, 200);
  assert.equal(listPushTokensForUser(db, yusuf.user.id).length, 0);
});

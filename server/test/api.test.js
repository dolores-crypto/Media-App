import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

const SECRET = 'test-secret';
let server;
let baseUrl;

before(async () => {
  const { listener } = createApp({ dbPath: ':memory:', secret: SECRET });
  server = createServer(listener);
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

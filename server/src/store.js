function now() {
  return new Date().toISOString();
}

// --- users ---

export function createUser(db, { username, email, passwordHash, displayName }) {
  const stmt = db.prepare(
    `INSERT INTO users (username, email, password_hash, display_name, created_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  const info = stmt.run(username, email, passwordHash, displayName, now());
  return getUserById(db, Number(info.lastInsertRowid));
}

export function getUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

export function getUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
}

export function getUserByUsername(db, username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
}

export function searchUsers(db, query, { limit = 20 } = {}) {
  const like = `%${query}%`;
  return db
    .prepare(
      `SELECT * FROM users WHERE username LIKE ? OR display_name LIKE ?
       ORDER BY username ASC LIMIT ?`
    )
    .all(like, like, limit);
}

export function updateUser(db, id, { displayName, bio, avatarUrl }) {
  const current = getUserById(db, id);
  if (!current) return null;
  db.prepare(
    `UPDATE users SET display_name = ?, bio = ?, avatar_url = ? WHERE id = ?`
  ).run(
    displayName ?? current.display_name,
    bio ?? current.bio,
    avatarUrl ?? current.avatar_url,
    id
  );
  return getUserById(db, id);
}

export function publicUser(user, extra = {}) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    bio: user.bio,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    ...extra,
  };
}

// --- follows ---

export function follow(db, followerId, followingId) {
  db.prepare(
    `INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)`
  ).run(followerId, followingId, now());
}

export function unfollow(db, followerId, followingId) {
  db.prepare(`DELETE FROM follows WHERE follower_id = ? AND following_id = ?`).run(
    followerId,
    followingId
  );
}

export function isFollowing(db, followerId, followingId) {
  return !!db
    .prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?')
    .get(followerId, followingId);
}

export function countFollowers(db, userId) {
  return db.prepare('SELECT COUNT(*) AS n FROM follows WHERE following_id = ?').get(userId).n;
}

export function countFollowing(db, userId) {
  return db.prepare('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?').get(userId).n;
}

export function listFollowers(db, userId) {
  return db
    .prepare(
      `SELECT users.* FROM users JOIN follows ON follows.follower_id = users.id
       WHERE follows.following_id = ? ORDER BY follows.created_at DESC`
    )
    .all(userId);
}

export function listFollowing(db, userId) {
  return db
    .prepare(
      `SELECT users.* FROM users JOIN follows ON follows.following_id = users.id
       WHERE follows.follower_id = ? ORDER BY follows.created_at DESC`
    )
    .all(userId);
}

// --- media items ---

export function upsertMediaItem(db, { type, source, externalId, title, creator = '', year = '', coverUrl = '' }) {
  db.prepare(
    `INSERT INTO media_items (type, source, external_id, title, creator, year, cover_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(source, external_id) DO UPDATE SET
       title = excluded.title, creator = excluded.creator, year = excluded.year, cover_url = excluded.cover_url`
  ).run(type, source, externalId, title, creator, year, coverUrl);
  return db
    .prepare('SELECT * FROM media_items WHERE source = ? AND external_id = ?')
    .get(source, externalId);
}

export function getMediaItem(db, id) {
  return db.prepare('SELECT * FROM media_items WHERE id = ?').get(id) || null;
}

export function publicMediaItem(item) {
  if (!item) return null;
  return {
    id: item.id,
    type: item.type,
    source: item.source,
    externalId: item.external_id,
    title: item.title,
    creator: item.creator,
    year: item.year,
    coverUrl: item.cover_url,
  };
}

export function mediaStats(db, mediaItemId) {
  const row = db
    .prepare('SELECT COUNT(*) AS n, AVG(rating) AS avg FROM logs WHERE media_item_id = ? AND rating IS NOT NULL')
    .get(mediaItemId);
  return { ratingCount: row.n, averageRating: row.avg != null ? Math.round(row.avg * 100) / 100 : null };
}

/** Media items ranked by log+review activity, optionally within the last `days` and/or filtered by `type`. */
export function getTrendingMedia(db, { type, days, limit = 20 } = {}) {
  const cutoff = days ? new Date(Date.now() - days * 86400000).toISOString() : null;
  const dateClause = cutoff ? 'AND created_at >= ?' : '';
  const typeClause = type ? 'AND media_items.type = ?' : '';

  const params = [];
  if (cutoff) params.push(cutoff);
  if (cutoff) params.push(cutoff);
  if (type) params.push(type);
  params.push(limit);

  return db
    .prepare(
      `SELECT media_items.*, COUNT(*) AS activity_count
       FROM (
         SELECT media_item_id FROM logs WHERE 1=1 ${dateClause}
         UNION ALL
         SELECT media_item_id FROM reviews WHERE media_item_id IS NOT NULL ${dateClause}
       ) AS activity
       JOIN media_items ON media_items.id = activity.media_item_id
       WHERE 1=1 ${typeClause}
       GROUP BY media_items.id
       ORDER BY activity_count DESC, media_items.id DESC
       LIMIT ?`
    )
    .all(...params);
}

/** Users not already followed by `viewerId`, ranked by follower count (ties broken by newest). */
export function getSuggestedUsers(db, viewerId, { limit = 20 } = {}) {
  return db
    .prepare(
      `SELECT users.*, (SELECT COUNT(*) FROM follows f WHERE f.following_id = users.id) AS follower_count
       FROM users
       WHERE users.id != ?
         AND users.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
       ORDER BY follower_count DESC, users.created_at DESC
       LIMIT ?`
    )
    .all(viewerId, viewerId, limit);
}

// --- logs ---

const LOG_STATUSES = ['want', 'in_progress', 'finished', 'dropped'];

export function isValidLogStatus(status) {
  return LOG_STATUSES.includes(status);
}

export function createLog(db, { userId, mediaItemId, status, rating, note }) {
  const ts = now();
  const info = db
    .prepare(
      `INSERT INTO logs (user_id, media_item_id, status, rating, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(userId, mediaItemId, status, rating ?? null, note ?? '', ts, ts);
  return getLog(db, Number(info.lastInsertRowid));
}

export function getLog(db, id) {
  return db.prepare('SELECT * FROM logs WHERE id = ?').get(id) || null;
}

export function updateLog(db, id, { status, rating, note }) {
  const current = getLog(db, id);
  if (!current) return null;
  db.prepare(
    `UPDATE logs SET status = ?, rating = ?, note = ?, updated_at = ? WHERE id = ?`
  ).run(
    status ?? current.status,
    rating === undefined ? current.rating : rating,
    note ?? current.note,
    now(),
    id
  );
  return getLog(db, id);
}

export function deleteLog(db, id) {
  db.prepare('DELETE FROM logs WHERE id = ?').run(id);
}

export function listLogsByUser(db, userId, { limit = 50, before } = {}) {
  if (before) {
    return db
      .prepare(
        `SELECT * FROM logs WHERE user_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?`
      )
      .all(userId, before, limit);
  }
  return db
    .prepare(`SELECT * FROM logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(userId, limit);
}

export function listLogsForMedia(db, mediaItemId, { limit = 50 } = {}) {
  return db
    .prepare(`SELECT * FROM logs WHERE media_item_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(mediaItemId, limit);
}

export function publicLog(log, { user, media, ...extra } = {}) {
  return {
    id: log.id,
    status: log.status,
    rating: log.rating,
    note: log.note,
    createdAt: log.created_at,
    updatedAt: log.updated_at,
    user,
    media,
    ...extra,
  };
}

// --- reviews ---

export function createReview(db, { userId, mediaItemId, title, body, rating }) {
  const ts = now();
  const info = db
    .prepare(
      `INSERT INTO reviews (user_id, media_item_id, title, body, rating, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(userId, mediaItemId ?? null, title, body, rating ?? null, ts, ts);
  return getReview(db, Number(info.lastInsertRowid));
}

export function getReview(db, id) {
  return db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) || null;
}

export function updateReview(db, id, { title, body, rating }) {
  const current = getReview(db, id);
  if (!current) return null;
  db.prepare(
    `UPDATE reviews SET title = ?, body = ?, rating = ?, updated_at = ? WHERE id = ?`
  ).run(
    title ?? current.title,
    body ?? current.body,
    rating === undefined ? current.rating : rating,
    now(),
    id
  );
  return getReview(db, id);
}

export function deleteReview(db, id) {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
}

export function listReviewsByUser(db, userId, { limit = 50, before } = {}) {
  if (before) {
    return db
      .prepare(
        `SELECT * FROM reviews WHERE user_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?`
      )
      .all(userId, before, limit);
  }
  return db
    .prepare(`SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(userId, limit);
}

export function listReviewsForMedia(db, mediaItemId, { limit = 50 } = {}) {
  return db
    .prepare(`SELECT * FROM reviews WHERE media_item_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(mediaItemId, limit);
}

export function publicReview(review, { user, media, ...extra } = {}) {
  return {
    id: review.id,
    title: review.title,
    body: review.body,
    rating: review.rating,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
    user,
    media,
    ...extra,
  };
}

// --- feed ---

export function getFeed(db, userId, { limit = 30, before } = {}) {
  const beforeClause = before ? 'AND created_at < ?' : '';
  const rows = db
    .prepare(
      `SELECT 'log' AS kind, id, user_id, media_item_id, created_at FROM logs
       WHERE user_id = ? OR user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
       ${beforeClause}
       UNION ALL
       SELECT 'review' AS kind, id, user_id, media_item_id, created_at FROM reviews
       WHERE user_id = ? OR user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
       ${beforeClause}
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(...(before ? [userId, userId, before, userId, userId, before, limit] : [userId, userId, userId, userId, limit]));
  return rows;
}

// --- likes ---

const LIKE_TARGET_TYPES = ['log', 'review'];

export function isValidLikeTarget(targetType) {
  return LIKE_TARGET_TYPES.includes(targetType);
}

export function likeTarget(db, userId, targetType, targetId) {
  db.prepare(
    `INSERT OR IGNORE INTO likes (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)`
  ).run(userId, targetType, targetId, now());
}

export function unlikeTarget(db, userId, targetType, targetId) {
  db.prepare(`DELETE FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?`).run(
    userId,
    targetType,
    targetId
  );
}

export function countLikes(db, targetType, targetId) {
  return db
    .prepare('SELECT COUNT(*) AS n FROM likes WHERE target_type = ? AND target_id = ?')
    .get(targetType, targetId).n;
}

export function isLikedBy(db, userId, targetType, targetId) {
  if (!userId) return false;
  return !!db
    .prepare('SELECT 1 FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?')
    .get(userId, targetType, targetId);
}

export function likeMeta(db, targetType, targetId, viewerId) {
  return {
    likeCount: countLikes(db, targetType, targetId),
    likedByMe: isLikedBy(db, viewerId, targetType, targetId),
  };
}

// --- comments ---

export function createComment(db, { userId, reviewId, body }) {
  const ts = now();
  const info = db
    .prepare(`INSERT INTO comments (user_id, review_id, body, created_at) VALUES (?, ?, ?, ?)`)
    .run(userId, reviewId, body, ts);
  return getComment(db, Number(info.lastInsertRowid));
}

export function getComment(db, id) {
  return db.prepare('SELECT * FROM comments WHERE id = ?').get(id) || null;
}

export function deleteComment(db, id) {
  db.prepare('DELETE FROM comments WHERE id = ?').run(id);
}

export function listCommentsForReview(db, reviewId) {
  return db.prepare('SELECT * FROM comments WHERE review_id = ? ORDER BY created_at ASC').all(reviewId);
}

export function countComments(db, reviewId) {
  return db.prepare('SELECT COUNT(*) AS n FROM comments WHERE review_id = ?').get(reviewId).n;
}

export function publicComment(comment, { user } = {}) {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.created_at,
    reviewId: comment.review_id,
    user,
  };
}

import { createNotification, listPushTokensForUser } from './store.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Records an in-app notification for `userId` and best-effort fires a push
 * notification to any registered devices. The push send is fire-and-forget:
 * it never throws and never blocks the caller, so a flaky or unreachable
 * push service can't break the follow/like/comment action that triggered it.
 */
export function notifyUser(db, { userId, actorId, type, targetType, targetId, title, body }) {
  if (userId === actorId) return;
  createNotification(db, { userId, actorId, type, targetType, targetId });
  sendPush(db, userId, { title, body, data: { type, targetType, targetId } }).catch((err) => {
    console.warn('Push notification send failed (non-fatal):', err.message);
  });
}

async function sendPush(db, userId, { title, body, data }) {
  const tokens = listPushTokensForUser(db, userId);
  if (tokens.length === 0) return;
  const messages = tokens.map((t) => ({ to: t.token, title, body, data, sound: 'default' }));
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    throw new Error(`Expo push API responded ${res.status}`);
  }
}

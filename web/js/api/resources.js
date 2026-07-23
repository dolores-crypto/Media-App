import { api } from './client.js';

export const AuthApi = {
  register: (input) => api.post('/api/auth/register', input),
  login: (input) => api.post('/api/auth/login', input),
  me: () => api.get('/api/me'),
  updateMe: (input) => api.patch('/api/me', input),
};

export const UsersApi = {
  search: (q) => api.get('/api/users/search', { q }),
  suggested: () => api.get('/api/users/suggested'),
  profile: (username) => api.get(`/api/users/${encodeURIComponent(username)}`),
  follow: (username) => api.post(`/api/users/${encodeURIComponent(username)}/follow`),
  unfollow: (username) => api.delete(`/api/users/${encodeURIComponent(username)}/follow`),
  followers: (username) => api.get(`/api/users/${encodeURIComponent(username)}/followers`),
  following: (username) => api.get(`/api/users/${encodeURIComponent(username)}/following`),
  logs: (username) => api.get(`/api/users/${encodeURIComponent(username)}/logs`),
  reviews: (username) => api.get(`/api/users/${encodeURIComponent(username)}/reviews`),
};

export const MediaApi = {
  search: (type, q) => api.get('/api/media/search', { type, q }),
  trending: (type) => api.get('/api/media/trending', type ? { type } : undefined),
  detail: (id) => api.get(`/api/media/${id}`),
};

export const LogsApi = {
  create: (input) => api.post('/api/logs', input),
  get: (id) => api.get(`/api/logs/${id}`),
  update: (id, input) => api.patch(`/api/logs/${id}`, input),
  remove: (id) => api.delete(`/api/logs/${id}`),
  like: (id) => api.post(`/api/logs/${id}/like`),
  unlike: (id) => api.delete(`/api/logs/${id}/like`),
};

export const ReviewsApi = {
  create: (input) => api.post('/api/reviews', input),
  get: (id) => api.get(`/api/reviews/${id}`),
  update: (id, input) => api.patch(`/api/reviews/${id}`, input),
  remove: (id) => api.delete(`/api/reviews/${id}`),
  like: (id) => api.post(`/api/reviews/${id}/like`),
  unlike: (id) => api.delete(`/api/reviews/${id}/like`),
};

export const CommentsApi = {
  list: (reviewId) => api.get(`/api/reviews/${reviewId}/comments`),
  create: (reviewId, body) => api.post(`/api/reviews/${reviewId}/comments`, { body }),
  remove: (id) => api.delete(`/api/comments/${id}`),
};

export const FeedApi = {
  list: (before) => api.get('/api/feed', before ? { before } : undefined),
};

export const NotificationsApi = {
  list: (before) => api.get('/api/notifications', before ? { before } : undefined),
  unreadCount: () => api.get('/api/notifications/unread-count'),
  markAllRead: () => api.post('/api/notifications/read'),
};

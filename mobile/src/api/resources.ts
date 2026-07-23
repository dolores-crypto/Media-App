import { api } from './client';
import type {
  AuthResponse,
  FeedEntry,
  LogEntry,
  LogStatus,
  MediaDetail,
  MediaSearchResult,
  MediaType,
  Review,
  User,
} from './types';

export interface MediaRef {
  mediaItemId?: number;
  media?: {
    type: MediaType;
    source: string;
    externalId: string;
    title: string;
    creator?: string;
    year?: string;
    coverUrl?: string;
  };
}

export const AuthApi = {
  register: (input: { username: string; email: string; password: string; displayName?: string }) =>
    api.post<AuthResponse>('/api/auth/register', input),
  login: (input: { email: string; password: string }) => api.post<AuthResponse>('/api/auth/login', input),
  me: () => api.get<User>('/api/me'),
  updateMe: (input: { displayName?: string; bio?: string; avatarUrl?: string }) =>
    api.patch<User>('/api/me', input),
};

export const UsersApi = {
  profile: (username: string) => api.get<User>(`/api/users/${encodeURIComponent(username)}`),
  follow: (username: string) => api.post<{ following: boolean }>(`/api/users/${encodeURIComponent(username)}/follow`),
  unfollow: (username: string) => api.delete<{ following: boolean }>(`/api/users/${encodeURIComponent(username)}/follow`),
  followers: (username: string) => api.get<User[]>(`/api/users/${encodeURIComponent(username)}/followers`),
  following: (username: string) => api.get<User[]>(`/api/users/${encodeURIComponent(username)}/following`),
  logs: (username: string) => api.get<LogEntry[]>(`/api/users/${encodeURIComponent(username)}/logs`),
  reviews: (username: string) => api.get<Review[]>(`/api/users/${encodeURIComponent(username)}/reviews`),
};

export const MediaApi = {
  search: (type: MediaType, q: string) => api.get<MediaSearchResult[]>('/api/media/search', { type, q }),
  detail: (id: number) => api.get<MediaDetail>(`/api/media/${id}`),
};

export const LogsApi = {
  create: (input: MediaRef & { status: LogStatus; rating?: number | null; note?: string }) =>
    api.post<LogEntry>('/api/logs', input),
  get: (id: number) => api.get<LogEntry>(`/api/logs/${id}`),
  update: (id: number, input: { status?: LogStatus; rating?: number | null; note?: string }) =>
    api.patch<LogEntry>(`/api/logs/${id}`, input),
  remove: (id: number) => api.delete<null>(`/api/logs/${id}`),
};

export const ReviewsApi = {
  create: (input: MediaRef & { title: string; body: string; rating?: number | null }) =>
    api.post<Review>('/api/reviews', input),
  get: (id: number) => api.get<Review>(`/api/reviews/${id}`),
  update: (id: number, input: { title?: string; body?: string; rating?: number | null }) =>
    api.patch<Review>(`/api/reviews/${id}`, input),
  remove: (id: number) => api.delete<null>(`/api/reviews/${id}`),
};

export const FeedApi = {
  list: (before?: string) => api.get<FeedEntry[]>('/api/feed', before ? { before } : undefined),
};

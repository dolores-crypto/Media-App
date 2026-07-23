export type MediaType = 'book' | 'movie' | 'tv' | 'music' | 'podcast';

export type LogStatus = 'want' | 'in_progress' | 'finished' | 'dropped';

export interface User {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  createdAt: string;
  followerCount?: number;
  followingCount?: number;
  isFollowedByMe?: boolean;
  isMe?: boolean;
}

export interface MediaItem {
  id: number;
  type: MediaType;
  source: string;
  externalId: string;
  title: string;
  creator: string;
  year: string;
  coverUrl: string;
}

export interface MediaSearchResult {
  source: string;
  externalId: string;
  type: MediaType;
  title: string;
  creator: string;
  year: string;
  coverUrl: string;
}

export interface MediaDetail extends MediaItem {
  ratingCount: number;
  averageRating: number | null;
  recentLogs: LogEntry[];
  reviews: Review[];
}

export interface TrendingMediaItem extends MediaItem {
  ratingCount: number;
  averageRating: number | null;
  activityCount: number;
}

export interface LogEntry {
  id: number;
  status: LogStatus;
  rating: number | null;
  note: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  media: MediaItem;
  likeCount: number;
  likedByMe: boolean;
}

export interface Review {
  id: number;
  title: string;
  body: string;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  user: User;
  media: MediaItem | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
}

export interface Comment {
  id: number;
  body: string;
  createdAt: string;
  reviewId: number;
  user: User;
}

export type FeedEntry = { kind: 'log'; item: LogEntry } | { kind: 'review'; item: Review };

export type NotificationType = 'follow' | 'like' | 'comment';

export type NotificationTarget =
  | { kind: 'log'; logId: number; mediaItemId: number }
  | { kind: 'review'; reviewId: number; title: string }
  | null;

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
  actor: User;
  target: NotificationTarget;
  read: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

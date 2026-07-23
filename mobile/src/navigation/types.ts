import type { MediaSearchResult } from '@/api/types';

/**
 * Single flat param list for the whole app. Detail screens (ItemDetail, WriteReview,
 * ReviewDetail, Profile, EditProfile, FollowList) live in the root stack alongside the
 * `Main` tab navigator; React Navigation bubbles `navigate()` calls from tab screens up
 * to the root stack automatically as long as screen names are unique, so tab screens can
 * push them directly without a separate per-tab stack.
 */
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  ItemDetail: { mediaItemId: number } | { searchResult: MediaSearchResult };
  WriteReview: { mediaItemId?: number; searchResult?: MediaSearchResult; reviewId?: number };
  ReviewDetail: { reviewId: number };
  Profile: { username: string };
  EditProfile: undefined;
  FollowList: { username: string; mode: 'followers' | 'following' };
};

import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { UsersApi } from '@/api/resources';
import { useAuth } from '@/context/AuthContext';
import { MediaCard } from '@/components/MediaCard';
import { StarRating } from '@/components/StarRating';
import { colors, spacing, statusLabels } from '@/theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ route, navigation }: Props) {
  return <ProfileView username={route.params.username} navigation={navigation} />;
}

/** Own-profile tab: resolves the current user's username, then reuses ProfileView. */
export function ProfileHomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <ProfileView username={user.username} navigation={navigation} />;
}

function ProfileView({
  username,
  navigation,
}: {
  username: string;
  navigation: NavigationProp<RootStackParamList>;
}) {
  const { user: me, logout } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'logs' | 'reviews'>('logs');

  const profileQuery = useQuery({
    queryKey: ['profile', username],
    queryFn: () => UsersApi.profile(username),
  });

  const logsQuery = useQuery({
    queryKey: ['userLogs', username],
    queryFn: () => UsersApi.logs(username),
    enabled: tab === 'logs',
  });

  const reviewsQuery = useQuery({
    queryKey: ['userReviews', username],
    queryFn: () => UsersApi.reviews(username),
    enabled: tab === 'reviews',
  });

  const followMutation = useMutation({
    mutationFn: () => (profileQuery.data?.isFollowedByMe ? UsersApi.unfollow(username) : UsersApi.follow(username)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  if (profileQuery.isLoading || !profileQuery.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const profile = profileQuery.data;
  const isMe = me?.id === profile.id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{profile.displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.displayName}>{profile.displayName}</Text>
        <Text style={styles.handle}>@{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.statsRow}>
          <Pressable onPress={() => navigation.navigate('FollowList', { username, mode: 'followers' })}>
            <Text style={styles.statValue}>{profile.followerCount ?? 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('FollowList', { username, mode: 'following' })}>
            <Text style={styles.statValue}>{profile.followingCount ?? 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </Pressable>
        </View>

        {isMe ? (
          <View style={styles.actionsRow}>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.secondaryButtonLabel}>Edit profile</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={logout}>
              <Text style={styles.secondaryButtonLabel}>Log out</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.followButton} onPress={() => followMutation.mutate()} disabled={followMutation.isPending}>
            <Text style={styles.followButtonLabel}>{profile.isFollowedByMe ? 'Following' : 'Follow'}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.tabRow}>
        <Pressable onPress={() => setTab('logs')} style={[styles.tab, tab === 'logs' && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === 'logs' && styles.tabLabelActive]}>Logs</Text>
        </Pressable>
        <Pressable onPress={() => setTab('reviews')} style={[styles.tab, tab === 'reviews' && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === 'reviews' && styles.tabLabelActive]}>Reviews</Text>
        </Pressable>
      </View>

      {tab === 'logs' ? (
        <FlatList
          style={styles.list}
          data={logsQuery.data ?? []}
          keyExtractor={(log) => String(log.id)}
          renderItem={({ item: log }) => (
            <View style={styles.logRow}>
              <MediaCard media={log.media} onPress={() => navigation.navigate('ItemDetail', { mediaItemId: log.media.id })} />
              <View style={styles.logMeta}>
                <Text style={styles.logStatus}>{statusLabels[log.status] ?? log.status}</Text>
                {log.rating ? <StarRating rating={log.rating} size={14} /> : null}
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No logs yet.</Text>}
        />
      ) : (
        <FlatList
          style={styles.list}
          data={reviewsQuery.data ?? []}
          keyExtractor={(review) => String(review.id)}
          renderItem={({ item: review }) => (
            <Pressable style={styles.reviewRow} onPress={() => navigation.navigate('ReviewDetail', { reviewId: review.id })}>
              <Text style={styles.reviewTitle}>{review.title}</Text>
              {review.rating ? <StarRating rating={review.rating} size={14} /> : null}
              <Text style={styles.reviewSnippet} numberOfLines={2}>
                {review.body}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No reviews yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { alignItems: 'center', padding: spacing.lg, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface, marginBottom: spacing.sm },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.textMuted, fontSize: 28, fontWeight: '700' },
  displayName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  handle: { color: colors.textMuted, fontSize: 13 },
  bio: { color: colors.text, fontSize: 13, textAlign: 'center', marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  statLabel: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  secondaryButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  secondaryButtonLabel: { color: colors.text, fontWeight: '600', fontSize: 13 },
  followButton: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  followButtonLabel: { color: '#0B0D12', fontWeight: '700' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabLabel: { color: colors.textMuted, fontWeight: '600' },
  tabLabelActive: { color: colors.text },
  list: { flex: 1, padding: spacing.md },
  logRow: { marginBottom: spacing.sm },
  logMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: spacing.md + 56 },
  logStatus: { color: colors.textMuted, fontSize: 12 },
  reviewRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 2 },
  reviewTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  reviewSnippet: { color: colors.textMuted, fontSize: 13 },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});

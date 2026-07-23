import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { FeedEntry } from '@/api/types';
import { MediaCard } from './MediaCard';
import { StarRating } from './StarRating';
import { LikeButton } from './LikeButton';
import { colors, spacing, statusLabels } from '@/theme/theme';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeedItem({ entry }: { entry: FeedEntry }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const header = (
    <Pressable onPress={() => navigation.navigate('Profile', { username: entry.item.user.username })}>
      <Text style={styles.author}>
        {entry.item.user.displayName} <Text style={styles.handle}>@{entry.item.user.username}</Text>
      </Text>
    </Pressable>
  );

  if (entry.kind === 'log') {
    const log = entry.item;
    return (
      <View style={styles.card}>
        {header}
        <Text style={styles.action}>{statusLabels[log.status] ?? log.status}</Text>
        <MediaCard media={log.media} onPress={() => navigation.navigate('ItemDetail', { mediaItemId: log.media.id })} />
        {log.rating ? <StarRating rating={log.rating} /> : null}
        {log.note ? <Text style={styles.note}>{log.note}</Text> : null}
        <View style={styles.footer}>
          <Text style={styles.timestamp}>{timeAgo(log.createdAt)}</Text>
          <LikeButton targetType="log" targetId={log.id} likeCount={log.likeCount} likedByMe={log.likedByMe} />
        </View>
      </View>
    );
  }

  const review = entry.item;
  return (
    <View style={styles.card}>
      {header}
      <Text style={styles.action}>wrote a review</Text>
      <Pressable onPress={() => navigation.navigate('ReviewDetail', { reviewId: review.id })}>
        <Text style={styles.reviewTitle}>{review.title}</Text>
        <Text style={styles.reviewSnippet} numberOfLines={3}>
          {review.body}
        </Text>
      </Pressable>
      {review.media ? (
        <MediaCard media={review.media} onPress={() => navigation.navigate('ItemDetail', { mediaItemId: review.media!.id })} />
      ) : null}
      {review.rating ? <StarRating rating={review.rating} /> : null}
      <View style={styles.footer}>
        <Text style={styles.timestamp}>
          {timeAgo(review.createdAt)}
          {review.commentCount > 0 ? ` · ${review.commentCount} comment${review.commentCount === 1 ? '' : 's'}` : ''}
        </Text>
        <LikeButton targetType="review" targetId={review.id} likeCount={review.likeCount} likedByMe={review.likedByMe} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  author: { color: colors.text, fontWeight: '600', fontSize: 14 },
  handle: { color: colors.textMuted, fontWeight: '400' },
  action: { color: colors.textMuted, fontSize: 13 },
  note: { color: colors.text, fontSize: 14, marginTop: spacing.xs },
  reviewTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 2 },
  reviewSnippet: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  timestamp: { color: colors.textMuted, fontSize: 11 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
});

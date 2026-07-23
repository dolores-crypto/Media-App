import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { ReviewsApi } from '@/api/resources';
import { useAuth } from '@/context/AuthContext';
import { MediaCard } from '@/components/MediaCard';
import { StarRating } from '@/components/StarRating';
import { LikeButton } from '@/components/LikeButton';
import { CommentsSection } from '@/components/CommentsSection';
import { colors, spacing } from '@/theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewDetail'>;

export function ReviewDetailScreen({ route, navigation }: Props) {
  const { reviewId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: review, isLoading } = useQuery({
    queryKey: ['review', reviewId],
    queryFn: () => ReviewsApi.get(reviewId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => ReviewsApi.remove(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      navigation.goBack();
    },
  });

  if (isLoading || !review) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isOwner = user?.id === review.user.id;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.navigate('Profile', { username: review.user.username })}>
        <Text style={styles.author}>
          {review.user.displayName} <Text style={styles.handle}>@{review.user.username}</Text>
        </Text>
      </Pressable>

      {review.rating ? <StarRating rating={review.rating} /> : null}
      <Text style={styles.title}>{review.title}</Text>

      {review.media ? (
        <MediaCard media={review.media} onPress={() => navigation.navigate('ItemDetail', { mediaItemId: review.media!.id })} />
      ) : null}

      <Text style={styles.body}>{review.body}</Text>

      <LikeButton targetType="review" targetId={review.id} likeCount={review.likeCount} likedByMe={review.likedByMe} />

      {isOwner ? (
        <View style={styles.ownerActions}>
          <Pressable style={styles.actionButton} onPress={() => navigation.navigate('WriteReview', { reviewId: review.id })}>
            <Text style={styles.actionLabel}>Edit</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              Alert.alert('Delete review?', 'This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
              ])
            }
          >
            <Text style={[styles.actionLabel, styles.destructive]}>Delete</Text>
          </Pressable>
        </View>
      ) : null}

      <CommentsSection reviewId={review.id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  author: { color: colors.text, fontWeight: '600', fontSize: 14 },
  handle: { color: colors.textMuted, fontWeight: '400' },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: spacing.xs },
  body: { color: colors.text, fontSize: 16, lineHeight: 24, marginTop: spacing.md },
  ownerActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  actionButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  actionLabel: { color: colors.primary, fontWeight: '600' },
  destructive: { color: colors.danger },
});

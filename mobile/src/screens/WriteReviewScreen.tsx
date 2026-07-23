import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { ReviewsApi } from '@/api/resources';
import { StarRating } from '@/components/StarRating';
import { colors, spacing } from '@/theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'WriteReview'>;

export function WriteReviewScreen({ route, navigation }: Props) {
  const { mediaItemId, searchResult, reviewId } = route.params;
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState<number | null>(null);

  const existing = useQuery({
    queryKey: ['review', reviewId],
    queryFn: () => ReviewsApi.get(reviewId!),
    enabled: !!reviewId,
  });

  useEffect(() => {
    if (existing.data) {
      setTitle(existing.data.title);
      setBody(existing.data.body);
      setRating(existing.data.rating);
    }
  }, [existing.data]);

  const mutation = useMutation({
    mutationFn: () => {
      if (reviewId) {
        return ReviewsApi.update(reviewId, { title, body, rating });
      }
      return ReviewsApi.create({
        mediaItemId,
        media: searchResult
          ? {
              type: searchResult.type,
              source: searchResult.source,
              externalId: searchResult.externalId,
              title: searchResult.title,
              creator: searchResult.creator,
              year: searchResult.year,
              coverUrl: searchResult.coverUrl,
            }
          : undefined,
        title,
        body,
        rating,
      });
    },
    onSuccess: (review) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (review.media) queryClient.invalidateQueries({ queryKey: ['media', review.media.id] });
      navigation.replace('ReviewDetail', { reviewId: review.id });
    },
  });

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !mutation.isPending;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Rating</Text>
      <StarRating rating={rating} onChange={setRating} size={28} />

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Give your review a title"
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Review</Text>
      <TextInput
        style={[styles.input, styles.bodyInput]}
        placeholder="Write your thoughts..."
        placeholderTextColor={colors.textMuted}
        value={body}
        onChangeText={setBody}
        multiline
      />

      {mutation.isError ? <Text style={styles.error}>Couldn't save your review. Try again.</Text> : null}

      <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} disabled={!canSubmit} onPress={() => mutation.mutate()}>
        {mutation.isPending ? <ActivityIndicator color="#0B0D12" /> : <Text style={styles.buttonLabel}>Publish review</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
  },
  bodyInput: { minHeight: 220, textAlignVertical: 'top' },
  button: { backgroundColor: colors.primary, borderRadius: 10, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { color: '#0B0D12', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, textAlign: 'center' },
});

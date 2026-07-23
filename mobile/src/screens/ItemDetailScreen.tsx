import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { LogStatus } from '@/api/types';
import { LogsApi, MediaApi } from '@/api/resources';
import { LogStatusPicker } from '@/components/LogStatusPicker';
import { StarRating } from '@/components/StarRating';
import { colors, spacing, typeLabels } from '@/theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

function mediaRefFromParams(params: Props['route']['params']) {
  if ('mediaItemId' in params) return { mediaItemId: params.mediaItemId };
  const r = params.searchResult;
  return { media: { type: r.type, source: r.source, externalId: r.externalId, title: r.title, creator: r.creator, year: r.year, coverUrl: r.coverUrl } };
}

export function ItemDetailScreen({ route, navigation }: Props) {
  const { params } = route;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LogStatus | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const hasId = 'mediaItemId' in params;
  const detailQuery = useQuery({
    queryKey: ['media', hasId ? params.mediaItemId : null],
    queryFn: () => MediaApi.detail((params as { mediaItemId: number }).mediaItemId),
    enabled: hasId,
  });

  const preview = !hasId ? params.searchResult : null;
  const media = detailQuery.data ?? preview;

  const logMutation = useMutation({
    mutationFn: () => LogsApi.create({ ...mediaRefFromParams(params), status: status!, rating, note }),
    onSuccess: (log) => {
      setSavedMessage('Saved to your logs.');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (!hasId) {
        navigation.setParams({ mediaItemId: log.media.id } as RootStackParamList['ItemDetail']);
      } else {
        queryClient.invalidateQueries({ queryKey: ['media', params.mediaItemId] });
      }
    },
  });

  if (!media) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {media.coverUrl ? (
          <Image source={{ uri: media.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]} />
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.type}>{typeLabels[media.type] ?? media.type}</Text>
          <Text style={styles.title}>{media.title}</Text>
          {media.creator ? (
            <Text style={styles.creator}>
              {media.creator}
              {media.year ? ` · ${media.year}` : ''}
            </Text>
          ) : null}
          {'ratingCount' in media && media.ratingCount > 0 ? (
            <View style={styles.ratingRow}>
              <StarRating rating={Math.round(media.averageRating ?? 0)} />
              <Text style={styles.ratingCount}>
                {media.averageRating?.toFixed(1)} ({media.ratingCount})
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Log this</Text>
        <LogStatusPicker value={status} onChange={setStatus} />
        <View style={styles.ratingPicker}>
          <StarRating rating={rating} onChange={setRating} size={28} />
        </View>
        <TextInput
          style={styles.noteInput}
          placeholder="Quick note (optional)"
          placeholderTextColor={colors.textMuted}
          value={note}
          onChangeText={setNote}
          multiline
        />
        <Pressable
          style={[styles.button, !status && styles.buttonDisabled]}
          disabled={!status || logMutation.isPending}
          onPress={() => logMutation.mutate()}
        >
          {logMutation.isPending ? (
            <ActivityIndicator color="#0B0D12" />
          ) : (
            <Text style={styles.buttonLabel}>Save log</Text>
          )}
        </Pressable>
        {savedMessage ? <Text style={styles.saved}>{savedMessage}</Text> : null}

        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            navigation.navigate('WriteReview', hasId ? { mediaItemId: params.mediaItemId } : { searchResult: params.searchResult })
          }
        >
          <Text style={styles.secondaryButtonLabel}>Write a full review</Text>
        </Pressable>
      </View>

      {'reviews' in media && media.reviews.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {media.reviews.map((review) => (
            <Pressable key={review.id} style={styles.reviewRow} onPress={() => navigation.navigate('ReviewDetail', { reviewId: review.id })}>
              <Text style={styles.reviewAuthor}>{review.user.displayName}</Text>
              {review.rating ? <StarRating rating={review.rating} size={14} /> : null}
              <Text style={styles.reviewTitle}>{review.title}</Text>
              <Text style={styles.reviewSnippet} numberOfLines={2}>
                {review.body}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', gap: spacing.md },
  cover: { width: 100, height: 150, borderRadius: 10, backgroundColor: colors.surface },
  coverPlaceholder: {},
  headerInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  type: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  creator: { color: colors.textMuted, fontSize: 14 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  ratingCount: { color: colors.textMuted, fontSize: 12 },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  ratingPicker: { marginVertical: spacing.xs },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  button: { backgroundColor: colors.primary, borderRadius: 10, padding: spacing.md, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { color: '#0B0D12', fontWeight: '700', fontSize: 15 },
  saved: { color: colors.textMuted, textAlign: 'center', fontSize: 12 },
  secondaryButton: { alignItems: 'center', padding: spacing.sm },
  secondaryButtonLabel: { color: colors.primary, fontWeight: '600' },
  reviewRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: 2 },
  reviewAuthor: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  reviewTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  reviewSnippet: { color: colors.textMuted, fontSize: 13 },
});

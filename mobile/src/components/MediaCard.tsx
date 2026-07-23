import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typeLabels } from '@/theme/theme';
import type { MediaItem, MediaSearchResult } from '@/api/types';

interface MediaCardProps {
  media: MediaItem | MediaSearchResult;
  onPress?: () => void;
  subtitle?: string;
}

export function MediaCard({ media, onPress, subtitle }: MediaCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      {media.coverUrl ? (
        <Image source={{ uri: media.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverPlaceholderText}>{media.title.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.type}>{typeLabels[media.type] ?? media.type}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {media.title}
        </Text>
        {media.creator ? (
          <Text style={styles.creator} numberOfLines={1}>
            {media.creator}
            {media.year ? ` · ${media.year}` : ''}
          </Text>
        ) : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  cover: { width: 56, height: 84, borderRadius: 6, backgroundColor: colors.surface },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  coverPlaceholderText: { color: colors.textMuted, fontSize: 24, fontWeight: '600' },
  info: { flex: 1, justifyContent: 'center', gap: 2 },
  type: { color: colors.primary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  creator: { color: colors.textMuted, fontSize: 13 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LogsApi, ReviewsApi } from '@/api/resources';
import { colors, spacing } from '@/theme/theme';

interface LikeButtonProps {
  targetType: 'log' | 'review';
  targetId: number;
  likeCount: number;
  likedByMe: boolean;
}

const APIS = { log: LogsApi, review: ReviewsApi };

export function LikeButton({ targetType, targetId, likeCount, likedByMe }: LikeButtonProps) {
  const [count, setCount] = useState(likeCount);
  const [liked, setLiked] = useState(likedByMe);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));
    setPending(true);
    try {
      const api = APIS[targetType];
      const result = nextLiked ? await api.like(targetId) : await api.unlike(targetId);
      setLiked(result.likedByMe);
      setCount(result.likeCount);
    } catch {
      setLiked(!nextLiked);
      setCount((c) => c + (nextLiked ? -1 : 1));
    } finally {
      setPending(false);
    }
  }

  return (
    <Pressable onPress={toggle} style={styles.row} hitSlop={8}>
      <Text style={[styles.icon, liked && styles.iconActive]}>{liked ? '♥' : '♡'}</Text>
      {count > 0 ? <Text style={styles.count}>{count}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  icon: { fontSize: 18, color: colors.textMuted },
  iconActive: { color: colors.danger },
  count: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
});

import React from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import type { AppNotification } from '@/api/types';
import { NotificationsApi } from '@/api/resources';
import { colors, spacing } from '@/theme/theme';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => NotificationsApi.list(),
  });

  const markReadMutation = useMutation({
    mutationFn: () => NotificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
  });

  function onPressNotification(n: AppNotification) {
    if (n.type === 'follow') {
      navigation.navigate('Profile', { username: n.actor.username });
      return;
    }
    if (n.target?.kind === 'review') {
      navigation.navigate('ReviewDetail', { reviewId: n.target.reviewId });
    } else if (n.target?.kind === 'log') {
      navigation.navigate('ItemDetail', { mediaItemId: n.target.mediaItemId });
    }
  }

  const hasUnread = (data ?? []).some((n) => !n.read);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={data ?? []}
      keyExtractor={(n) => String(n.id)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListHeaderComponent={
        hasUnread ? (
          <Pressable style={styles.markReadButton} onPress={() => markReadMutation.mutate()}>
            <Text style={styles.markReadLabel}>Mark all as read</Text>
          </Pressable>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable style={[styles.row, !item.read && styles.rowUnread]} onPress={() => onPressNotification(item)}>
          {item.actor.avatarUrl ? (
            <Image source={{ uri: item.actor.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{item.actor.displayName.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.textColumn}>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.timestamp}>{timeAgo(item.createdAt)}</Text>
          </View>
          {!item.read ? <View style={styles.unreadDot} /> : null}
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  markReadButton: { alignSelf: 'flex-end', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
  markReadLabel: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: 10,
    marginBottom: spacing.xs,
  },
  rowUnread: { backgroundColor: colors.surface },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.textMuted, fontWeight: '700' },
  textColumn: { flex: 1, gap: 2 },
  message: { color: colors.text, fontSize: 14 },
  timestamp: { color: colors.textMuted, fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});

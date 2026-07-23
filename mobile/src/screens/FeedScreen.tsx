import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FeedApi } from '@/api/resources';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';
import { colors, spacing } from '@/theme/theme';

export function FeedScreen() {
  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['feed'],
    queryFn: () => FeedApi.list(),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Couldn't load your feed. Pull down to retry.</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      style={styles.container}
      data={data ?? []}
      keyExtractor={(entry) => `${entry.kind}-${entry.item.id}`}
      renderItem={({ item }) => <ActivityFeedItem entry={item} />}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Nothing here yet. Follow people and log what you're into to build your feed.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 14 },
});

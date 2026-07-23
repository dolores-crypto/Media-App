import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FeedApi } from '@/api/resources';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';
import { colors, spacing } from '@/theme/theme';

const PAGE_SIZE = 30;

export function FeedScreen() {
  const { data, isLoading, isRefetching, refetch, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['feed'],
      queryFn: ({ pageParam }: { pageParam?: string }) => FeedApi.list(pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.length < PAGE_SIZE ? undefined : lastPage[lastPage.length - 1]?.item.createdAt,
    });

  const entries = data?.pages.flat() ?? [];

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
      data={entries}
      keyExtractor={(entry) => `${entry.kind}-${entry.item.id}`}
      renderItem={({ item }) => <ActivityFeedItem entry={item} />}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} /> : null}
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

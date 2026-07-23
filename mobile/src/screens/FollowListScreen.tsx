import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { UsersApi } from '@/api/resources';
import { colors, spacing } from '@/theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowList'>;

export function FollowListScreen({ route, navigation }: Props) {
  const { username, mode } = route.params;

  const { data } = useQuery({
    queryKey: ['followList', username, mode],
    queryFn: () => (mode === 'followers' ? UsersApi.followers(username) : UsersApi.following(username)),
  });

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={data ?? []}
      keyExtractor={(u) => String(u.id)}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => navigation.push('Profile', { username: item.username })}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{item.displayName.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View>
            <Text style={styles.name}>{item.displayName}</Text>
            <Text style={styles.handle}>@{item.username}</Text>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>{mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.textMuted, fontWeight: '700' },
  name: { color: colors.text, fontWeight: '600' },
  handle: { color: colors.textMuted, fontSize: 12 },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});

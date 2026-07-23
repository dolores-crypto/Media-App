import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { MediaType } from '@/api/types';
import { MediaApi, UsersApi } from '@/api/resources';
import { MediaCard } from '@/components/MediaCard';
import { colors, spacing, typeLabels } from '@/theme/theme';

type Mode = MediaType | 'people';

const MODES: Mode[] = ['book', 'movie', 'tv', 'music', 'podcast', 'people'];

function modeLabel(mode: Mode) {
  return mode === 'people' ? 'People' : typeLabels[mode];
}

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [mode, setMode] = useState<Mode>('book');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(timer);
  }, [input]);

  const mediaSearch = useQuery({
    queryKey: ['search', mode, query],
    queryFn: () => MediaApi.search(mode as MediaType, query),
    enabled: mode !== 'people' && query.length > 1,
  });

  const peopleSearch = useQuery({
    queryKey: ['userSearch', query],
    queryFn: () => UsersApi.search(query),
    enabled: mode === 'people' && query.length > 1,
  });

  const isFetching = mode === 'people' ? peopleSearch.isFetching : mediaSearch.isFetching;
  const error = mode === 'people' ? peopleSearch.error : mediaSearch.error;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={mode === 'people' ? 'Search people...' : `Search ${modeLabel(mode).toLowerCase()}s...`}
        placeholderTextColor={colors.textMuted}
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
      />

      <View style={styles.typeRow}>
        {MODES.map((m) => {
          const active = m === mode;
          return (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{modeLabel(m)}</Text>
            </Pressable>
          );
        })}
      </View>

      {isFetching ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} /> : null}
      {error ? <Text style={styles.emptyText}>Search failed. Check your connection and try again.</Text> : null}

      {mode === 'people' ? (
        <FlatList
          style={styles.list}
          data={peopleSearch.data ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable style={styles.personRow} onPress={() => navigation.navigate('Profile', { username: item.username })}>
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{item.displayName.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <View>
                <Text style={styles.personName}>{item.displayName}</Text>
                <Text style={styles.personHandle}>@{item.username}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            !isFetching && query.length > 1 ? <Text style={styles.emptyText}>No people found for "{query}"</Text> : null
          }
        />
      ) : (
        <FlatList
          style={styles.list}
          data={mediaSearch.data ?? []}
          keyExtractor={(item) => `${item.source}-${item.externalId}`}
          renderItem={({ item }) => <MediaCard media={item} onPress={() => navigation.navigate('ItemDetail', { searchResult: item })} />}
          ListEmptyComponent={
            !isFetching && query.length > 1 ? <Text style={styles.emptyText}>No results for "{query}"</Text> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipLabelActive: { color: '#0B0D12' },
  list: { flex: 1, marginTop: spacing.sm },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.textMuted, fontWeight: '700' },
  personName: { color: colors.text, fontWeight: '600' },
  personHandle: { color: colors.textMuted, fontSize: 12 },
});

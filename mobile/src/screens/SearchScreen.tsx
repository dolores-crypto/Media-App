import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { MediaType } from '@/api/types';
import { MediaApi } from '@/api/resources';
import { MediaCard } from '@/components/MediaCard';
import { colors, spacing, typeLabels } from '@/theme/theme';

const TYPES: MediaType[] = ['book', 'movie', 'tv', 'music', 'podcast'];

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [type, setType] = useState<MediaType>('book');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(timer);
  }, [input]);

  const { data, isFetching, error } = useQuery({
    queryKey: ['search', type, query],
    queryFn: () => MediaApi.search(type, query),
    enabled: query.length > 1,
  });

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={`Search ${typeLabels[type].toLowerCase()}s...`}
        placeholderTextColor={colors.textMuted}
        value={input}
        onChangeText={setInput}
      />

      <View style={styles.typeRow}>
        {TYPES.map((t) => {
          const active = t === type;
          return (
            <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{typeLabels[t]}</Text>
            </Pressable>
          );
        })}
      </View>

      {isFetching ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} /> : null}
      {error ? <Text style={styles.emptyText}>Search failed. Check your connection and try again.</Text> : null}

      <FlatList
        style={styles.list}
        data={data ?? []}
        keyExtractor={(item) => `${item.source}-${item.externalId}`}
        renderItem={({ item }) => <MediaCard media={item} onPress={() => navigation.navigate('ItemDetail', { searchResult: item })} />}
        ListEmptyComponent={
          !isFetching && query.length > 1 ? <Text style={styles.emptyText}>No results for "{query}"</Text> : null
        }
      />
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
});

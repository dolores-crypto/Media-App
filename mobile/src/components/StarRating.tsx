import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/theme';

interface StarRatingProps {
  rating: number | null;
  onChange?: (rating: number) => void;
  size?: number;
}

export function StarRating({ rating, onChange, size = 22 }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={styles.row}>
      {stars.map((value) => {
        const filled = rating != null && value <= rating;
        const star = (
          <Text key={value} style={{ fontSize: size, color: filled ? colors.star : colors.border }}>
            {filled ? '★' : '☆'}
          </Text>
        );
        if (!onChange) return star;
        return (
          <Pressable key={value} onPress={() => onChange(value)} hitSlop={6}>
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, statusLabels } from '@/theme/theme';
import type { LogStatus } from '@/api/types';

const STATUSES: LogStatus[] = ['want', 'in_progress', 'finished', 'dropped'];

export function LogStatusPicker({
  value,
  onChange,
}: {
  value: LogStatus | null;
  onChange: (status: LogStatus) => void;
}) {
  return (
    <View style={styles.row}>
      {STATUSES.map((status) => {
        const active = value === status;
        return (
          <Pressable
            key={status}
            onPress={() => onChange(status)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{statusLabels[status]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  labelActive: { color: '#0B0D12' },
});

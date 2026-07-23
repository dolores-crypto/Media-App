import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CommentsApi } from '@/api/resources';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/theme/theme';

export function CommentsSection({ reviewId }: { reviewId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', reviewId],
    queryFn: () => CommentsApi.list(reviewId),
  });

  const postMutation = useMutation({
    mutationFn: (body: string) => CommentsApi.create(reviewId, body),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['comments', reviewId] });
      queryClient.invalidateQueries({ queryKey: ['review', reviewId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => CommentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', reviewId] });
      queryClient.invalidateQueries({ queryKey: ['review', reviewId] });
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Comments</Text>

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}

      {(comments ?? []).map((comment) => (
        <View key={comment.id} style={styles.comment}>
          <Text style={styles.commentAuthor}>{comment.user.displayName}</Text>
          <Text style={styles.commentBody}>{comment.body}</Text>
          {user?.id === comment.user.id ? (
            <Pressable onPress={() => deleteMutation.mutate(comment.id)}>
              <Text style={styles.deleteLabel}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {!isLoading && (comments ?? []).length === 0 ? <Text style={styles.emptyText}>No comments yet.</Text> : null}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          style={[styles.postButton, !draft.trim() && styles.postButtonDisabled]}
          disabled={!draft.trim() || postMutation.isPending}
          onPress={() => postMutation.mutate(draft.trim())}
        >
          <Text style={styles.postButtonLabel}>Post</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.lg, gap: spacing.sm },
  heading: { color: colors.text, fontSize: 16, fontWeight: '700' },
  comment: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm, gap: 2 },
  commentAuthor: { color: colors.text, fontWeight: '600', fontSize: 13 },
  commentBody: { color: colors.textMuted, fontSize: 14 },
  deleteLabel: { color: colors.danger, fontSize: 12, marginTop: 2 },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  composer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'flex-end' },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    color: colors.text,
    minHeight: 40,
  },
  postButton: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  postButtonDisabled: { opacity: 0.5 },
  postButtonLabel: { color: '#0B0D12', fontWeight: '700' },
});

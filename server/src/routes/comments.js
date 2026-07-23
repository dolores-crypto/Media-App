import { HttpError } from '../http.js';
import { requireAuth } from '../auth.js';
import { getComment, deleteComment } from '../store.js';

export function registerCommentRoutes(router, db, secret) {
  router.delete('/api/comments/:id', (ctx) => {
    const user = requireAuth(ctx, db, secret);
    const comment = getComment(db, Number(ctx.params.id));
    if (!comment) throw new HttpError(404, 'Comment not found');
    if (comment.user_id !== user.id) throw new HttpError(403, 'You can only delete your own comments');
    deleteComment(db, comment.id);
    return { status: 204, body: null };
  });
}

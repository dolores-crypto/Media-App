import { CommentsApi } from '../api/resources.js';
import { escapeHtml } from '../util.js';

export async function mountCommentsSection(container, reviewId, currentUserId) {
  async function refresh() {
    const comments = await CommentsApi.list(reviewId);
    container.innerHTML = `
      <div class="section-heading">Comments</div>
      ${comments.length === 0 ? '<p class="muted">No comments yet.</p>' : ''}
      ${comments
        .map(
          (c) => `
        <div class="comment">
          <div class="comment-author">${escapeHtml(c.user.displayName)}</div>
          <div class="comment-body">${escapeHtml(c.body)}</div>
          ${c.user.id === currentUserId ? `<button class="btn-danger-link" data-delete-comment="${c.id}" style="font-size:12px">Delete</button>` : ''}
        </div>`
        )
        .join('')}
      <div class="composer">
        <textarea id="comment-input" placeholder="Add a comment..."></textarea>
        <button class="btn-primary" id="comment-submit" style="width:auto">Post</button>
      </div>
    `;

    container.querySelector('#comment-submit').addEventListener('click', async () => {
      const textarea = container.querySelector('#comment-input');
      const body = textarea.value.trim();
      if (!body) return;
      await CommentsApi.create(reviewId, body);
      await refresh();
    });

    container.querySelectorAll('[data-delete-comment]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CommentsApi.remove(Number(btn.getAttribute('data-delete-comment')));
        await refresh();
      });
    });
  }

  await refresh();
}

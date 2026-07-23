import { NotificationsApi } from '../api/resources.js';
import { setUnreadCount } from '../components/nav.js';
import { escapeHtml, timeAgo } from '../util.js';

function targetHref(n) {
  if (n.type === 'follow') return `/profile/${encodeURIComponent(n.actor.username)}`;
  if (n.target?.kind === 'review') return `/review/${n.target.reviewId}`;
  if (n.target?.kind === 'log') return `/item/${n.target.mediaItemId}`;
  return null;
}

export async function render(container) {
  const notifications = await NotificationsApi.list();
  const hasUnread = notifications.some((n) => !n.read);

  container.innerHTML = `
    ${hasUnread ? '<button class="btn-link" id="mark-read" style="float:right">Mark all as read</button>' : ''}
    <div style="clear:both"></div>
    ${
      notifications.length > 0
        ? notifications
            .map((n) => {
              const href = targetHref(n);
              const avatar = n.actor.avatarUrl
                ? `<img class="avatar" src="${escapeHtml(n.actor.avatarUrl)}" alt="" />`
                : `<div class="avatar avatar-placeholder">${escapeHtml(n.actor.displayName.slice(0, 1).toUpperCase())}</div>`;
              return `
          <div class="notification-row ${n.read ? '' : 'unread'}" ${href ? `data-nav="${href}"` : ''}>
            ${avatar}
            <div style="flex:1">
              <div>${escapeHtml(n.message)}</div>
              <div class="timestamp">${timeAgo(n.createdAt)}</div>
            </div>
            ${!n.read ? '<div class="unread-dot"></div>' : ''}
          </div>`;
            })
            .join('')
        : '<div class="center"><p class="muted">No notifications yet.</p></div>'
    }
  `;

  const markReadBtn = container.querySelector('#mark-read');
  if (markReadBtn) {
    markReadBtn.addEventListener('click', async () => {
      await NotificationsApi.markAllRead();
      setUnreadCount(0);
      container.querySelectorAll('.notification-row.unread').forEach((row) => {
        row.classList.remove('unread');
        row.querySelector('.unread-dot')?.remove();
      });
      markReadBtn.remove();
    });
  }
}

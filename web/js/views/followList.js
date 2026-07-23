import { UsersApi } from '../api/resources.js';
import { escapeHtml } from '../util.js';

export async function render(container, params) {
  const { username, mode } = params;
  const list = mode === 'followers' ? await UsersApi.followers(username) : await UsersApi.following(username);

  container.innerHTML =
    list.length > 0
      ? list
          .map(
            (u) => `
      <div class="person-row" data-nav="/profile/${encodeURIComponent(u.username)}">
        ${
          u.avatarUrl
            ? `<img class="avatar" src="${escapeHtml(u.avatarUrl)}" alt="" />`
            : `<div class="avatar avatar-placeholder">${escapeHtml(u.displayName.slice(0, 1).toUpperCase())}</div>`
        }
        <div>
          <div class="person-name">${escapeHtml(u.displayName)}</div>
          <div class="person-handle">@${escapeHtml(u.username)}</div>
        </div>
      </div>`
          )
          .join('')
      : `<p class="muted">${mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>`;
}

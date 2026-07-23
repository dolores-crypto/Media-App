import { UsersApi } from '../api/resources.js';
import { getState, logout } from '../state.js';
import { navigate } from '../router.js';
import { mediaCardHtml } from '../components/mediaCard.js';
import { starsHtml } from '../components/starRating.js';
import { escapeHtml, STATUS_LABELS } from '../util.js';

export async function render(container, params) {
  const { username } = params;
  const profile = await UsersApi.profile(username);
  const { user: me } = getState();
  const isMe = me?.id === profile.id;
  let tab = 'logs';

  function headerHtml() {
    const avatar = profile.avatarUrl
      ? `<img class="avatar" style="width:72px;height:72px" src="${escapeHtml(profile.avatarUrl)}" alt="" />`
      : `<div class="avatar avatar-placeholder" style="width:72px;height:72px;font-size:28px">${escapeHtml(profile.displayName.slice(0, 1).toUpperCase())}</div>`;
    return `
      <div class="profile-header">
        ${avatar}
        <div style="font-size:20px;font-weight:800">${escapeHtml(profile.displayName)}</div>
        <div class="person-handle">@${escapeHtml(profile.username)}</div>
        ${profile.bio ? `<p>${escapeHtml(profile.bio)}</p>` : ''}
        <div class="profile-stats">
          <div class="profile-stat" data-nav="/follow-list/${encodeURIComponent(username)}/followers">
            <div class="profile-stat-value">${profile.followerCount ?? 0}</div>
            <div class="profile-stat-label">Followers</div>
          </div>
          <div class="profile-stat" data-nav="/follow-list/${encodeURIComponent(username)}/following">
            <div class="profile-stat-value">${profile.followingCount ?? 0}</div>
            <div class="profile-stat-label">Following</div>
          </div>
        </div>
        ${
          isMe
            ? `<div class="owner-actions">
                 <button class="btn-secondary" id="edit-profile">Edit profile</button>
                 <button class="btn-secondary" id="logout">Log out</button>
               </div>`
            : `<button class="btn-primary" id="follow-toggle" style="width:auto;margin-top:12px">${profile.isFollowedByMe ? 'Following' : 'Follow'}</button>`
        }
      </div>
      <div class="tab-row">
        <div class="tab ${tab === 'logs' ? 'active' : ''}" data-tab="logs">Logs</div>
        <div class="tab ${tab === 'reviews' ? 'active' : ''}" data-tab="reviews">Reviews</div>
      </div>
      <div id="tab-content"></div>
    `;
  }

  async function paintTabContent() {
    const contentEl = container.querySelector('#tab-content');
    contentEl.innerHTML = '<div class="center"><div class="spinner"></div></div>';
    if (tab === 'logs') {
      const logs = await UsersApi.logs(username);
      contentEl.innerHTML =
        logs.length > 0
          ? logs
              .map(
                (log) => `
        <div style="margin-bottom:8px">
          ${mediaCardHtml(log.media, { navHref: `/item/${log.media.id}` })}
          <div style="display:flex;gap:8px;align-items:center;margin-left:68px">
            <span class="muted" style="font-size:12px">${STATUS_LABELS[log.status] ?? log.status}</span>
            ${log.rating ? starsHtml(log.rating) : ''}
          </div>
        </div>`
              )
              .join('')
          : '<p class="muted">No logs yet.</p>';
    } else {
      const reviews = await UsersApi.reviews(username);
      contentEl.innerHTML =
        reviews.length > 0
          ? reviews
              .map(
                (review) => `
        <div class="card" data-nav="/review/${review.id}" style="cursor:pointer">
          <div style="font-weight:700">${escapeHtml(review.title)}</div>
          ${review.rating ? starsHtml(review.rating) : ''}
          <p class="muted">${escapeHtml(review.body.slice(0, 160))}${review.body.length > 160 ? '…' : ''}</p>
        </div>`
              )
              .join('')
          : '<p class="muted">No reviews yet.</p>';
    }
  }

  function wireHeader() {
    container.querySelectorAll('[data-tab]').forEach((tabEl) => {
      tabEl.addEventListener('click', async () => {
        tab = tabEl.getAttribute('data-tab');
        container.querySelectorAll('[data-tab]').forEach((t) => t.classList.toggle('active', t === tabEl));
        await paintTabContent();
      });
    });

    if (isMe) {
      container.querySelector('#edit-profile').addEventListener('click', () => navigate('/edit-profile'));
      container.querySelector('#logout').addEventListener('click', () => {
        logout();
        navigate('/login');
      });
    } else {
      container.querySelector('#follow-toggle').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        try {
          if (profile.isFollowedByMe) {
            await UsersApi.unfollow(username);
            profile.isFollowedByMe = false;
            profile.followerCount = Math.max(0, (profile.followerCount ?? 1) - 1);
          } else {
            await UsersApi.follow(username);
            profile.isFollowedByMe = true;
            profile.followerCount = (profile.followerCount ?? 0) + 1;
          }
          container.innerHTML = headerHtml();
          wireHeader();
          await paintTabContent();
        } finally {
          btn.disabled = false;
        }
      });
    }
  }

  container.innerHTML = headerHtml();
  wireHeader();
  await paintTabContent();
}

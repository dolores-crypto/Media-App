import { AuthApi } from '../api/resources.js';
import { getState, refreshUser } from '../state.js';
import { navigate } from '../router.js';
import { escapeHtml } from '../util.js';

export async function render(container) {
  const { user } = getState();

  container.innerHTML = `
    <div class="section-heading">Display name</div>
    <input id="displayName" type="text" value="${escapeHtml(user.displayName)}" />
    <div class="section-heading">Bio</div>
    <textarea id="bio" placeholder="Tell people what you're into">${escapeHtml(user.bio)}</textarea>
    <div class="section-heading">Avatar URL</div>
    <input id="avatarUrl" type="text" placeholder="https://..." value="${escapeHtml(user.avatarUrl)}" />
    <p class="error" id="error" style="display:none"></p>
    <button class="btn-primary" id="save" style="margin-top:16px">Save</button>
  `;

  container.querySelector('#save').addEventListener('click', async () => {
    const errorEl = container.querySelector('#error');
    errorEl.style.display = 'none';
    try {
      await AuthApi.updateMe({
        displayName: container.querySelector('#displayName').value.trim(),
        bio: container.querySelector('#bio').value,
        avatarUrl: container.querySelector('#avatarUrl').value.trim(),
      });
      await refreshUser();
      navigate(`/profile/${encodeURIComponent(user.username)}`);
    } catch (err) {
      errorEl.textContent = err.message || "Couldn't save changes. Try again.";
      errorEl.style.display = 'block';
    }
  });
}

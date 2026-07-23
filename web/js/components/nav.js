import { getState, subscribe } from '../state.js';
import { NotificationsApi } from '../api/resources.js';

const LINKS = [
  { href: '/feed', label: 'Feed' },
  { href: '/search', label: 'Search' },
  { href: '/notifications', label: 'Notifications' },
];

let unreadCount = 0;
let renderFn = () => {};

export function mountNav(navEl) {
  let polledForUserId = null;

  renderFn = () => {
    const { user } = getState();
    if (!user) {
      navEl.innerHTML = `<div class="nav-brand">Media-App</div>`;
      return;
    }
    const path = location.hash.slice(1).split('?')[0] || '/feed';
    const profileHref = `/profile/${encodeURIComponent(user.username)}`;
    navEl.innerHTML = `
      <div class="nav-brand">Media-App</div>
      ${LINKS.map(
        (l) => `
        <a class="nav-link ${path === l.href ? 'active' : ''}" data-nav="${l.href}">
          ${l.label}${l.href === '/notifications' && unreadCount > 0 ? `<span class="nav-badge">${unreadCount}</span>` : ''}
        </a>`
      ).join('')}
      <a class="nav-link ${path === profileHref ? 'active' : ''}" data-nav="${profileHref}">Profile</a>
    `;
  };

  async function pollUnread() {
    if (!getState().user) return;
    try {
      const { count } = await NotificationsApi.unreadCount();
      unreadCount = count;
      renderFn();
    } catch {
      // Non-fatal: badge just stays stale until the next successful poll.
    }
  }

  // initAuth() resolves asynchronously, so a plain immediate pollUnread() here would
  // usually run before the user is known and silently no-op until the next 30s tick.
  // Re-checking on every auth state change (login, logout, initAuth resolving) instead
  // catches the moment a user becomes known, keyed by id so it only fires once per session.
  function onStateChange() {
    renderFn();
    const { user } = getState();
    if (user && user.id !== polledForUserId) {
      polledForUserId = user.id;
      pollUnread();
    } else if (!user) {
      polledForUserId = null;
    }
  }

  subscribe(onStateChange);
  window.addEventListener('hashchange', renderFn);
  onStateChange();
  setInterval(pollUnread, 30000);
}

export function setUnreadCount(n) {
  unreadCount = n;
  renderFn();
}

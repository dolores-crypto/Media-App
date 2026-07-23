import { route, start, navigate, setAuthCheck, setUnauthorizedHandler } from './router.js';
import { initAuth, getState } from './state.js';
import { mountNav } from './components/nav.js';
import { handleLikeClick } from './components/likeButton.js';

import * as loginView from './views/login.js';
import * as registerView from './views/register.js';
import * as feedView from './views/feed.js';
import * as searchView from './views/search.js';
import * as itemDetailView from './views/itemDetail.js';
import * as writeReviewView from './views/writeReview.js';
import * as reviewDetailView from './views/reviewDetail.js';
import * as profileView from './views/profile.js';
import * as editProfileView from './views/editProfile.js';
import * as followListView from './views/followList.js';
import * as notificationsView from './views/notifications.js';

route('/login', loginView.render);
route('/register', registerView.render);
route('/feed', feedView.render, { auth: true });
route('/search', searchView.render, { auth: true });
route('/write-review', writeReviewView.render, { auth: true });
route('/item/:id', itemDetailView.render, { auth: true });
route('/review/:id', reviewDetailView.render, { auth: true });
route('/edit-profile', editProfileView.render, { auth: true });
route('/follow-list/:username/:mode', followListView.render, { auth: true });
route('/notifications', notificationsView.render, { auth: true });
route('/profile/:username', profileView.render, { auth: true });

setAuthCheck(() => !!getState().user);
setUnauthorizedHandler(() => navigate('/login'));

document.addEventListener('click', (e) => {
  const navTarget = e.target.closest('[data-nav]');
  if (navTarget) {
    e.preventDefault();
    navigate(navTarget.getAttribute('data-nav'));
    return;
  }
  const likeTarget = e.target.closest('[data-like]');
  if (likeTarget) {
    e.preventDefault();
    handleLikeClick(likeTarget);
  }
});

const appEl = document.getElementById('app');
const navEl = document.getElementById('nav');

mountNav(navEl);

(async () => {
  await initAuth();
  if (!location.hash) {
    navigate(getState().user ? '/feed' : '/login');
  }
  start(appEl);
})();

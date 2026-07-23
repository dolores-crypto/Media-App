import { MediaApi, UsersApi } from '../api/resources.js';
import { mediaCardHtml } from '../components/mediaCard.js';
import { debounce, escapeHtml, TYPE_LABELS } from '../util.js';

const MODES = ['book', 'movie', 'tv', 'music', 'podcast', 'people'];

function modeLabel(mode) {
  return mode === 'people' ? 'People' : TYPE_LABELS[mode];
}

function personRowHtml(user, { showFollowerCount = false } = {}) {
  const avatar = user.avatarUrl
    ? `<img class="avatar" src="${escapeHtml(user.avatarUrl)}" alt="" />`
    : `<div class="avatar avatar-placeholder">${escapeHtml(user.displayName.slice(0, 1).toUpperCase())}</div>`;
  const followerSuffix =
    showFollowerCount && user.followerCount ? ` · ${user.followerCount} follower${user.followerCount === 1 ? '' : 's'}` : '';
  return `
    <div class="person-row" data-nav="/profile/${encodeURIComponent(user.username)}">
      ${avatar}
      <div>
        <div class="person-name">${escapeHtml(user.displayName)}</div>
        <div class="person-handle">@${escapeHtml(user.username)}${followerSuffix}</div>
      </div>
    </div>`;
}

export async function render(container) {
  let mode = 'book';
  let query = '';
  const debouncedSearch = debounce(() => runSearch(), 350);

  function shellHtml() {
    return `
      <input id="search-input" type="text" placeholder="${mode === 'people' ? 'Search people...' : `Search ${modeLabel(mode).toLowerCase()}s...`}" value="${escapeHtml(query)}" />
      <div class="chip-row">
        ${MODES.map((m) => `<button class="chip ${m === mode ? 'active' : ''}" data-mode="${m}">${modeLabel(m)}</button>`).join('')}
      </div>
      <div id="search-heading" class="section-heading"></div>
      <div id="search-results"></div>
    `;
  }

  function wireShell() {
    container.querySelector('#search-input').addEventListener('input', (e) => {
      query = e.target.value;
      debouncedSearch();
    });
    container.querySelectorAll('[data-mode]').forEach((chip) => {
      chip.addEventListener('click', () => {
        mode = chip.getAttribute('data-mode');
        container.innerHTML = shellHtml();
        wireShell();
        runSearch();
      });
    });
  }

  async function runSearch() {
    const isDiscover = query.trim().length <= 1;
    const headingEl = container.querySelector('#search-heading');
    const resultsEl = container.querySelector('#search-results');
    headingEl.textContent = isDiscover ? (mode === 'people' ? 'People to follow' : `Trending ${modeLabel(mode).toLowerCase()}s`) : '';
    resultsEl.innerHTML = '<div class="center"><div class="spinner"></div></div>';

    try {
      if (mode === 'people') {
        const results = isDiscover ? await UsersApi.suggested() : await UsersApi.search(query.trim());
        resultsEl.innerHTML =
          results.length > 0
            ? results.map((u) => personRowHtml(u, { showFollowerCount: isDiscover })).join('')
            : `<p class="muted">${isDiscover ? 'No suggestions yet — check back once more people join.' : `No people found for "${escapeHtml(query)}"`}</p>`;
      } else {
        const results = isDiscover ? await MediaApi.trending(mode) : await MediaApi.search(mode, query.trim());
        resultsEl.innerHTML =
          results.length > 0
            ? results
                .map((item) => {
                  const subtitle =
                    isDiscover && 'activityCount' in item
                      ? `${item.activityCount} recent log${item.activityCount === 1 ? '' : 's'}${item.averageRating ? ` · ★ ${item.averageRating.toFixed(1)}` : ''}`
                      : '';
                  const navHref = 'id' in item ? `/item/${item.id}` : `/item/new?${searchResultQuery(item)}`;
                  return mediaCardHtml(item, { subtitle, navHref });
                })
                .join('')
            : `<p class="muted">${isDiscover ? 'Nothing trending yet — be the first to log something.' : `No results for "${escapeHtml(query)}"`}</p>`;
      }
    } catch {
      resultsEl.innerHTML = '<p class="error">Something went wrong. Check your connection and try again.</p>';
    }
  }

  function searchResultQuery(item) {
    return new URLSearchParams({
      type: item.type,
      source: item.source,
      externalId: item.externalId,
      title: item.title,
      creator: item.creator || '',
      year: item.year || '',
      coverUrl: item.coverUrl || '',
    }).toString();
  }

  container.innerHTML = shellHtml();
  wireShell();
  await runSearch();
}

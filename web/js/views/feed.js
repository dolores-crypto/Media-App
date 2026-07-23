import { FeedApi } from '../api/resources.js';
import { activityItemHtml } from '../components/activityItem.js';

export async function render(container) {
  let entries = [];
  let cursor;
  let hasMore = true;

  async function loadPage() {
    const page = await FeedApi.list(cursor);
    entries = entries.concat(page);
    hasMore = page.length >= 30;
    if (page.length > 0) cursor = page[page.length - 1].item.createdAt;
  }

  function paint() {
    if (entries.length === 0) {
      container.innerHTML = `<div class="center"><p class="muted">Nothing here yet. Follow people and log what you're into to build your feed.</p></div>`;
      return;
    }
    container.innerHTML = `
      <div>${entries.map(activityItemHtml).join('')}</div>
      ${hasMore ? '<button class="btn-secondary load-more" id="load-more">Load more</button>' : ''}
    `;
    const loadMoreBtn = container.querySelector('#load-more');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', async () => {
        loadMoreBtn.textContent = 'Loading...';
        loadMoreBtn.disabled = true;
        await loadPage();
        paint();
      });
    }
  }

  await loadPage();
  paint();
}

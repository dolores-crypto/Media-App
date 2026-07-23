// End-to-end browser test for the web client, driven with Playwright.
//
// Requires two things running first:
//   1. The API server (server/), e.g. `AUTH_SECRET=x PORT=4000 node server/src/server.js`
//   2. This web app (web/), e.g. `PORT=5173 node server.js`
// Then: node test/e2e.mjs   (override with WEB_URL if not on the defaults)
//
// Playwright itself is not a dependency of this project (kept dependency-free like the
// rest of the app) — install it yourself to run this: `npm install -D playwright && npx
// playwright install chromium`, or point PLAYWRIGHT_REQUIRE_PATH at an existing install.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function loadPlaywright() {
  const explicitPath = process.env.PLAYWRIGHT_REQUIRE_PATH;
  const candidates = explicitPath ? [explicitPath] : ['playwright'];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try the next candidate
    }
  }
  console.error(
    'Could not load the "playwright" package. Install it with `npm install -D playwright && npx playwright ' +
      'install chromium`, or set PLAYWRIGHT_REQUIRE_PATH to an existing installation.'
  );
  process.exit(1);
}

const { chromium } = loadPlaywright();

const BASE = process.env.WEB_URL || 'http://localhost:5173';
let failures = 0;

function ok(desc) {
  console.log(`  ok - ${desc}`);
}
function fail(desc, err) {
  failures++;
  console.log(`  FAIL - ${desc}${err ? `: ${err.message ?? err}` : ''}`);
}
async function check(desc, fn, page) {
  try {
    await fn();
    ok(desc);
  } catch (err) {
    fail(desc, err);
    if (page) {
      try {
        console.log('    url:', page.url());
        console.log('    body snippet:', (await page.textContent('main')).slice(0, 400).replace(/\s+/g, ' '));
      } catch {
        // best-effort diagnostics only
      }
    }
  }
}

const rand = Math.random().toString(36).slice(2, 8);
const userA = { username: `alice_${rand}`, email: `alice_${rand}@example.com`, password: 'password123' };
const userB = { username: `bob_${rand}`, email: `bob_${rand}@example.com`, password: 'password123' };

async function registerViaUi(page, user) {
  await page.goto(`${BASE}/#/register`);
  await page.fill('#username', user.username);
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.click('#submit');
  await page.waitForURL(/#\/feed/, { timeout: 5000 });
}

(async () => {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  pageA.on('pageerror', (e) => console.log('  [pageerror A]', e.message));
  pageB.on('pageerror', (e) => console.log('  [pageerror B]', e.message));

  console.log('== Registration & auth ==');
  await check('register redirects to feed', () => registerViaUi(pageA, userA));
  await check('register second user (bob)', () => registerViaUi(pageB, userB));
  await check('session persists after reload', async () => {
    await pageA.reload();
    await pageA.waitForSelector('.nav-link', { timeout: 5000 });
    const hasProfileLink = await pageA.locator('.nav-link:has-text("Profile")').count();
    if (hasProfileLink === 0) throw new Error('nav did not show authenticated links after reload');
  });

  console.log('== Search & discover ==');
  await check('search screen shows trending discover content for books', async () => {
    await pageA.goto(`${BASE}/#/search`);
    await pageA.waitForSelector('#search-heading', { timeout: 5000 });
    const heading = await pageA.textContent('#search-heading');
    if (!heading.toLowerCase().includes('trending')) throw new Error(`unexpected heading: ${heading}`);
  });
  await check('typing a query switches to search results heading', async () => {
    await pageA.fill('#search-input', 'dune');
    await pageA.waitForTimeout(600);
    const heading = await pageA.textContent('#search-heading');
    if (heading.trim() !== '') throw new Error(`expected empty heading during a real search, got: ${heading}`);
  });

  console.log('== Logging an item (manual media, so no live network dependency) ==');
  const mediaQuery = new URLSearchParams({
    type: 'book',
    source: 'manual',
    externalId: `pw-test-book-${rand}`,
    title: 'The Sandbox Chronicles',
    creator: 'Test Author',
    year: '2024',
    coverUrl: '',
  }).toString();

  let reviewUrl;
  await check('open item detail for a fresh (unsaved) media ref', async () => {
    await pageA.goto(`${BASE}/#/item/new?${mediaQuery}`);
    await pageA.waitForSelector('#save-log', { timeout: 5000 });
    const title = await pageA.textContent('main');
    if (!title.includes('The Sandbox Chronicles')) throw new Error('title not rendered');
  });

  await check('log status + rating + note saves and redirects to a stable item id', async () => {
    await pageA.click('[data-status="finished"]');
    await pageA.locator('.star-choice').nth(3).click(); // 4 stars
    await pageA.fill('#note', 'Loved this test book.');
    await pageA.click('#save-log');
    await pageA.waitForURL(/#\/item\/\d+/, { timeout: 5000 });
    await pageA.waitForSelector('#write-review', { timeout: 5000 });
    const bodyText = await pageA.textContent('main');
    if (!bodyText.includes('The Sandbox Chronicles')) throw new Error('redirected item page missing title');
  });

  console.log('== Writing a review ==');
  await check('write a full review from item detail', async () => {
    await pageA.click('#write-review');
    await pageA.waitForSelector('#title', { timeout: 5000 });
    await pageA.fill('#title', 'A fantastic sandbox read');
    await pageA.fill('#body', 'This book really tested my patience for good prose. Highly recommend.');
    await pageA.locator('.star-choice').nth(4).click(); // 5 stars
    await pageA.click('#submit');
    await pageA.waitForURL(/#\/review\/\d+/, { timeout: 5000 });
    reviewUrl = pageA.url();
    await pageA.waitForSelector('#comments', { timeout: 5000 });
    const bodyText = await pageA.textContent('main');
    if (!bodyText.includes('A fantastic sandbox read')) throw new Error('review title not shown on detail page');
  }, pageA);

  console.log('== Social: follow, feed, likes, comments ==');
  await check("bob follows alice from alice's profile", async () => {
    await pageB.goto(`${BASE}/#/profile/${userA.username}`);
    await pageB.waitForSelector('#follow-toggle', { timeout: 5000 });
    await pageB.click('#follow-toggle');
    await pageB.waitForSelector('button:has-text("Following")', { timeout: 5000 });
  });

  await check("bob's feed shows alice's review and log", async () => {
    await pageB.goto(`${BASE}/#/feed`);
    await pageB.waitForSelector('.card', { timeout: 5000 });
    const feedText = await pageB.textContent('main');
    if (!feedText.includes('A fantastic sandbox read')) throw new Error('feed missing review entry');
    if (!feedText.includes('Sandbox Chronicles')) throw new Error('feed missing log entry media title');
  });

  await check('bob likes review from the feed and the count updates optimistically', async () => {
    const likeBtn = pageB.locator('[data-like][data-like-type="review"]').first();
    await likeBtn.click();
    await pageB.waitForTimeout(400);
    const countText = await likeBtn.locator('[data-like-count-label]').textContent();
    if (countText.trim() !== '1') throw new Error(`expected like count 1, got "${countText}"`);
    if ((await likeBtn.getAttribute('data-liked')) !== 'true') throw new Error('like button did not flip to liked state');
  });

  await check('bob comments on the review', async () => {
    await pageB.goto(reviewUrl);
    await pageB.waitForSelector('#comment-input', { timeout: 5000 });
    await pageB.fill('#comment-input', 'Great review, Alice!');
    await pageB.click('#comment-submit');
    await pageB.waitForSelector('.comment-body:has-text("Great review, Alice!")', { timeout: 5000 });
  });

  console.log('== Notifications reach alice ==');
  await check('alice sees follow, like, and comment notifications', async () => {
    await pageA.goto(`${BASE}/#/notifications`);
    await pageA.waitForSelector('.notification-row', { timeout: 5000 });
    const text = await pageA.textContent('main');
    if (!text.includes('started following you')) throw new Error('missing follow notification');
    if (!text.includes('liked your review')) throw new Error('missing like notification');
    if (!text.includes('commented on your review')) throw new Error('missing comment notification');
  });

  await check('unread badge shows on Notifications nav link', async () => {
    await pageA.reload();
    await pageA.waitForSelector('.nav-link', { timeout: 5000 });
    await pageA.waitForTimeout(300);
    const count = await pageA.locator('.nav-link:has-text("Notifications") .nav-badge').count();
    if (count === 0) throw new Error('expected an unread badge');
  }, pageA);

  await check('mark all as read clears the badge', async () => {
    await pageA.click('#mark-read');
    await pageA.waitForTimeout(300);
    const stillUnread = await pageA.locator('.notification-row.unread').count();
    if (stillUnread !== 0) throw new Error('rows still marked unread after mark-all-read');
  });

  console.log('== Profile editing & follow lists ==');
  await check('edit profile persists bio change', async () => {
    await pageA.goto(`${BASE}/#/edit-profile`);
    await pageA.waitForSelector('#bio', { timeout: 5000 });
    await pageA.fill('#bio', 'I test sandboxes for a living.');
    await pageA.click('#save');
    await pageA.waitForURL(new RegExp(`#/profile/${userA.username}`), { timeout: 5000 });
    await pageA.waitForSelector('.profile-header', { timeout: 5000 });
    const text = await pageA.textContent('main');
    if (!text.includes('I test sandboxes for a living.')) throw new Error('bio not shown on own profile after save');
  }, pageA);

  await check("alice's followers list shows bob", async () => {
    await pageA.goto(`${BASE}/#/follow-list/${userA.username}/followers`);
    await pageA.waitForSelector('.person-row', { timeout: 5000 });
    const text = await pageA.textContent('main');
    if (!text.includes(userB.username)) throw new Error('follower list missing bob');
  }, pageA);

  await check('bob can unfollow alice and the button reverts', async () => {
    await pageB.goto(`${BASE}/#/profile/${userA.username}`);
    await pageB.waitForSelector('button:has-text("Following")', { timeout: 5000 });
    await pageB.click('#follow-toggle');
    await pageB.waitForSelector('button:has-text("Follow"):not(:has-text("Following"))', { timeout: 5000 });
  }, pageB);

  console.log('== Logout ==');
  await check('logout returns to login screen and clears session', async () => {
    await pageA.goto(`${BASE}/#/profile/${userA.username}`);
    await pageA.waitForSelector('#logout', { timeout: 5000 });
    await pageA.click('#logout');
    await pageA.waitForURL(/#\/login/, { timeout: 5000 });
    await pageA.reload();
    await pageA.waitForURL(/#\/login/, { timeout: 5000 });
  });

  await browser.close();

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error('Fatal error running verification:', err);
  process.exit(1);
});

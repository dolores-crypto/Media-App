# Media-App

Track and review what you're reading, watching, and listening to — log books, movies,
TV, music, and podcasts, rate and review them, and follow other people's activity.
Think Goodreads + Letterboxd + Substack, for every kind of media.

## Structure

```
server/   Node.js API (auth, follows, media search, logs, reviews, feed)
mobile/   React Native (Expo) app
```

## Backend (`server/`)

Deliberately **zero npm dependencies** — it only uses Node.js built-ins:

- `node:sqlite` for storage (a single file, `server/data/app.db`)
- `node:crypto` for password hashing (scrypt) and signed session tokens (HMAC-SHA256, not JWT)
- `node:http` plus a ~100-line hand-rolled router (`src/http.js`) for routing/JSON
- global `fetch` to call external media-metadata APIs

Requires **Node.js 22.5+** (for `node:sqlite`).

### Run it

```bash
cd server
AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") npm start
```

The API listens on `http://localhost:4000` by default (`PORT` to override). Set `AUTH_SECRET`
to a stable random value in any environment where sessions need to survive a restart — if
unset, the server generates a random one at boot and warns you.

### Test it

```bash
cd server
npm test
```

Runs the full suite (`node --test`, 15 tests): end-to-end API tests (auth, follows, logs,
reviews, feed, user search, likes, comments) against a real in-memory database, plus unit
tests for the media-search response normalizers.

### Media search

`GET /api/media/search?type=book|movie|tv|music|podcast&q=...` proxies to free,
key-less public APIs:

- **book** → [Open Library Search API](https://openlibrary.org/dev/docs/api/search)
- **movie / tv / music / podcast** → [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/)

No API keys to configure. A picked search result gets upserted into the local `media_items`
table the first time someone logs or reviews it, so it gets a stable local ID going forward.

### API overview

| Method & path | Auth | Purpose |
|---|---|---|
| POST `/api/auth/register`, `/api/auth/login` | — | Create a session |
| GET/PATCH `/api/me` | required | Current user |
| GET `/api/users/search?q=` | optional | Find people by username/display name |
| GET `/api/users/:username` | optional | Profile + follow counts |
| POST/DELETE `/api/users/:username/follow` | required | Follow graph |
| GET `/api/users/:username/{followers,following,logs,reviews}` | — | Lists |
| GET `/api/media/search`, GET `/api/media/:id` | — | Search + item detail with stats |
| POST/GET/PATCH/DELETE `/api/logs[/:id]` | owner for writes | Status + rating + note |
| POST/DELETE `/api/logs/:id/like` | required | Like/unlike a log |
| POST/GET/PATCH/DELETE `/api/reviews[/:id]` | owner for writes | Long-form review, optionally tied to media |
| POST/DELETE `/api/reviews/:id/like` | required | Like/unlike a review |
| POST/GET `/api/reviews/:id/comments`, DELETE `/api/comments/:id` | POST/DELETE require auth | Comment thread on a review |
| GET `/api/feed` | required | Own + followed users' activity, newest first (cursor pagination via `?before=`) |

## Mobile app (`mobile/`)

Expo + React Native + TypeScript, React Navigation (stack + bottom tabs), TanStack Query
for data fetching/caching, `expo-secure-store` for the session token.

Screens: login/register, home feed (infinite scroll), cross-type media search + people
search, item detail (log status + star rating + note, or write a full review), review
detail (with likes and comments), user profile (logs/reviews tabs, follow/unfollow), edit
profile, followers/following lists. Logs and reviews can be liked from the feed or their
detail screen; reviews have a comment thread.

### Run it

```bash
cd mobile
npm install
npx expo install   # aligns dependency versions with your installed Expo SDK
npx expo start
```

Point the app at your running API by editing `extra.apiUrl` in `mobile/app.json` (defaults
to `http://localhost:4000`, which won't reach your machine from a physical device or most
simulators — use your machine's LAN IP, or `10.0.2.2` for the Android emulator).

## Known limitation of this build

This was built in a sandboxed environment with **no outbound internet access** — `npm install`
could not be run at all. That's why the backend was written dependency-free: it was fully
built, run, and tested (15 passing tests) inside the sandbox. The mobile app could not be
installed, compiled, or run the same way; its TypeScript was instead sanity-checked with a
loosely-typed stub pass (no real bugs found) but has **not** been verified with a real
`tsc`/Metro build or in Expo Go. Before relying on it, run:

```bash
cd mobile && npm install && npx expo install && npm run typecheck && npx expo start
```

import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT || 4000);
const DB_PATH = process.env.DB_PATH || new URL('../data/app.db', import.meta.url).pathname;

let secret = process.env.AUTH_SECRET;
if (!secret) {
  secret = randomBytes(32).toString('hex');
  console.warn(
    'AUTH_SECRET is not set — using a random secret for this run. ' +
      'Set AUTH_SECRET in the environment for stable sessions across restarts.'
  );
}

const { listener } = createApp({ dbPath: DB_PATH, secret });

createServer(listener).listen(PORT, () => {
  console.log(`Media-App API listening on http://localhost:${PORT}`);
});

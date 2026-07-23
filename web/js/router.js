const routes = [];
let rootEl = null;

export function route(pattern, handler, { auth = false } = {}) {
  const keys = [];
  const regexSource = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  routes.push({ pattern: new RegExp(`^${regexSource}$`), keys, handler, auth });
}

export function navigate(path) {
  location.hash = path;
}

function parseHash() {
  const raw = location.hash.slice(1) || '/feed';
  const [pathname, search] = raw.split('?');
  return { pathname, query: Object.fromEntries(new URLSearchParams(search || '')) };
}

function matchRoute(pathname) {
  for (const r of routes) {
    const m = r.pattern.exec(pathname);
    if (!m) continue;
    const params = {};
    r.keys.forEach((key, i) => {
      params[key] = decodeURIComponent(m[i + 1]);
    });
    return { handler: r.handler, auth: r.auth, params };
  }
  return null;
}

let onUnauthorized = () => navigate('/login');

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

let isAuthed = () => false;

export function setAuthCheck(fn) {
  isAuthed = fn;
}

async function render() {
  const { pathname, query } = parseHash();
  const matched = matchRoute(pathname);
  if (!matched) {
    rootEl.innerHTML = '<div class="center"><p class="muted">Page not found.</p></div>';
    return;
  }
  if (matched.auth && !isAuthed()) {
    onUnauthorized();
    return;
  }
  rootEl.innerHTML = '<div class="center"><div class="spinner"></div></div>';
  try {
    await matched.handler(rootEl, matched.params, query);
  } catch (err) {
    rootEl.innerHTML = `<div class="center"><p class="error">${err.message ?? 'Something went wrong.'}</p></div>`;
  }
}

export function start(root) {
  rootEl = root;
  window.addEventListener('hashchange', render);
  render();
}

export function rerender() {
  render();
}

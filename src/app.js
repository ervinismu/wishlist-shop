// HTTP request handling: the JSON API under /api, and static files for the web page.
//
// No framework, only Node's built-in modules. To add a route, add an entry to
// `routes` below and a test in test/api.test.js.

import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findProduct, products } from './products.js';
import { MAX_NOTE_LENGTH, MAX_QUANTITY, MAX_WISHLIST_ITEMS } from './store.js';

const PUBLIC_DIR = resolve(fileURLToPath(new URL('../public', import.meta.url)));
const MAX_BODY_BYTES = 100_000;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// ---------------------------------------------------------------- helpers

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

// Reads and parses a JSON request body. Throws HttpError(400) on bad JSON.
export async function readJsonBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Request body is too large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
}

// Wishlist entries joined with their product details.
function wishlistView(store) {
  return store
    .getWishlist()
    .map((entry) => ({ ...entry, product: findProduct(entry.productId) }))
    .filter((item) => item.product !== null);
}

// Total price of wishlist items in cents (price x quantity).
function totalCents(items) {
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

const SORTS = {
  added: (a, b) => (a.addedAt < b.addedAt ? -1 : a.addedAt > b.addedAt ? 1 : 0),
  name: (a, b) => a.product.name.localeCompare(b.product.name),
  'price-asc': (a, b) => a.product.price - b.product.price,
  'price-desc': (a, b) => b.product.price - a.product.price,
};

function parseQuantity(value) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_QUANTITY) {
    throw new HttpError(400, `Quantity must be a whole number from 1 to ${MAX_QUANTITY}`);
  }
  return value;
}

// Returns the trimmed note, or null when it is empty (which removes the note).
function parseNote(value) {
  if (typeof value !== 'string') throw new HttpError(400, 'Note must be text');
  const note = value.trim();
  if ([...note].length > MAX_NOTE_LENGTH) {
    throw new HttpError(400, `Notes can be at most ${MAX_NOTE_LENGTH} characters`);
  }
  return note === '' ? null : note;
}

// ---------------------------------------------------------------- routes
// Each route: [METHOD, path pattern, handler]. `:name` matches one path segment.

const routes = [
  ['GET', '/api/health', () => ({ ok: true })],

  // Optional query: q=text to match in the name (ignores case and surrounding spaces).
  ['GET', '/api/products', ({ url }) => {
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    return { products: products.filter((product) => product.name.toLowerCase().includes(q)) };
  }],

  ['GET', '/api/products/:id', ({ params }) => {
    const product = findProduct(params.id);
    if (!product) throw new HttpError(404, 'Product not found');
    return { product };
  }],

  // Optional query: sort=added|name|price-asc|price-desc, q=text to match in the name.
  ['GET', '/api/wishlist', ({ store, url }) => {
    const sort = url.searchParams.get('sort') ?? 'added';
    if (!Object.hasOwn(SORTS, sort)) {
      throw new HttpError(400, 'sort must be one of: added, name, price-asc, price-desc');
    }
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const all = wishlistView(store);
    const items = all
      .filter((item) => item.product.name.toLowerCase().includes(q))
      .sort(SORTS[sort]);
    return { items };
  }],

  // Total of everything on the wishlist in cents (price x quantity), whatever a filter shows.
  ['GET', '/api/wishlist/total', ({ store }) => ({ total: totalCents(wishlistView(store)) })],

  ['PATCH', '/api/wishlist/:productId', async ({ req, params, store }) => {
    const { quantity, note } = (await readJsonBody(req)) ?? {};
    if (quantity !== undefined || note === undefined) parseQuantity(quantity);
    const update = { quantity };
    if (note !== undefined) update.note = parseNote(note);
    const entry = store.updateWishlistItem(params.productId, update);
    if (!entry) throw new HttpError(404, 'Product is not in your wishlist');
    return { item: { ...entry, product: findProduct(entry.productId) } };
  }],

  ['POST', '/api/wishlist', async ({ req, store }) => {
    const { productId, quantity = 1 } = (await readJsonBody(req)) ?? {};
    if (typeof productId !== 'string' || productId === '') {
      throw new HttpError(400, 'productId must be a string');
    }
    parseQuantity(quantity);
    const product = findProduct(productId);
    if (!product) throw new HttpError(404, 'Product not found');
    if (store.countWishlist() >= MAX_WISHLIST_ITEMS) {
      throw new HttpError(409, `Your wishlist is full (${MAX_WISHLIST_ITEMS} items)`);
    }
    const entry = store.addToWishlist(productId, quantity);
    if (!entry) throw new HttpError(409, 'Product is already in your wishlist');
    return { status: 201, body: { item: { ...entry, product } } };
  }],

  ['POST', '/api/share', ({ store }) => {
    const token = store.getOrCreateShareToken();
    return { status: 201, body: { token, path: `/shared/${token}` } };
  }],

  ['GET', '/api/shared/:token', ({ params, store }) => {
    if (!store.isValidShareToken(params.token)) {
      throw new HttpError(404, "This wishlist link doesn't work");
    }
    // Notes are private: never include them on the shared list.
    const items = wishlistView(store).map(({ note, ...item }) => item);
    return { items, total: totalCents(items) };
  }],

  ['DELETE', '/api/wishlist/:productId', ({ params, store }) => {
    if (!store.removeFromWishlist(params.productId)) {
      throw new HttpError(404, 'Product is not in your wishlist');
    }
    return { removed: params.productId };
  }],
];

function matchRoute(method, pathname) {
  const parts = pathname.split('/').filter(Boolean);
  let pathMatched = false;
  for (const [routeMethod, pattern, handler] of routes) {
    const patternParts = pattern.split('/').filter(Boolean);
    if (patternParts.length !== parts.length) continue;
    const params = {};
    const ok = patternParts.every((p, i) => {
      if (p.startsWith(':')) {
        params[p.slice(1)] = decodeURIComponent(parts[i]);
        return true;
      }
      return p === parts[i];
    });
    if (!ok) continue;
    pathMatched = true;
    if (routeMethod === method) return { handler, params };
  }
  return { pathMatched };
}

// ---------------------------------------------------------------- static files

async function serveStatic(pathname, res) {
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = normalize(join(PUBLIC_DIR, relative));
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + sep)) {
    throw new HttpError(404, 'Not found');
  }
  let body;
  try {
    body = await readFile(filePath);
  } catch {
    throw new HttpError(404, 'Not found');
  }
  res.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
    'Content-Length': body.length,
  });
  res.end(body);
}

// ---------------------------------------------------------------- shared page

const BAD_LINK_PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wishlist link doesn't work</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="layout">
    <section>
      <h1>This wishlist link doesn't work</h1>
      <p>The link may be wrong or out of date. Ask the person who sent it for a new one.</p>
      <p><a href="/">Go to the shop</a></p>
    </section>
  </main>
</body>
</html>
`;

async function serveSharedPage(token, store, res) {
  if (!store.isValidShareToken(token)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(BAD_LINK_PAGE);
    return;
  }
  await serveStatic('/shared.html', res);
}

// ---------------------------------------------------------------- app

export function createApp({ store }) {
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const { pathname } = url;
    try {
      if (pathname.startsWith('/api/') || pathname === '/api') {
        const match = matchRoute(req.method, pathname);
        if (!match.handler) {
          throw match.pathMatched
            ? new HttpError(405, 'Method not allowed')
            : new HttpError(404, 'Not found');
        }
        const result = await match.handler({ req, url, params: match.params, store });
        const status = result?.status ?? 200;
        const body = result?.body ?? result;
        sendJson(res, status, body);
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');
      const shared = pathname.match(/^\/shared\/([^/]*)$/);
      if (shared) {
        let token = '';
        try {
          token = decodeURIComponent(shared[1]);
        } catch {
          // malformed escape: treated as an unknown token
        }
        await serveSharedPage(token, store, res);
        return;
      }
      await serveStatic(pathname, res);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      if (pathname.startsWith('/api')) {
        sendJson(res, status, { error: status === 500 ? 'Internal server error' : err.message });
      } else {
        res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(status === 404 ? 'Not found' : 'Error');
      }
    }
  };
}

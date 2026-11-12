// API tests. Each test gets a fresh server with an in-memory store.
// Run with: npm test

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app.js';
import { MAX_WISHLIST_ITEMS, createStore } from '../src/store.js';

let server;
let baseUrl;
const store = createStore(); // no file: data stays in memory

before(async () => {
  server = createServer(createApp({ store }));
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => store.reset());

async function api(path, options = {}) {
  const res = await fetch(baseUrl + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

describe('health', () => {
  test('GET /api/health returns ok', async () => {
    const { status, body } = await api('/api/health');
    assert.equal(status, 200);
    assert.deepEqual(body, { ok: true });
  });
});

describe('products', () => {
  test('GET /api/products lists all products', async () => {
    const { status, body } = await api('/api/products');
    assert.equal(status, 200);
    assert.ok(body.products.length >= 8);
    for (const p of body.products) {
      assert.equal(typeof p.id, 'string');
      assert.equal(typeof p.name, 'string');
      assert.ok(Number.isInteger(p.price), 'price is in whole cents');
    }
  });

  test('GET /api/products?q= matches names ignoring case and surrounding spaces', async () => {
    const { status, body } = await api('/api/products?q=%20%20MUG%20');
    assert.equal(status, 200);
    assert.deepEqual(body.products.map((p) => p.name), ['Ceramic Mug']);
  });

  test('GET /api/products with empty or missing q returns all products', async () => {
    const all = (await api('/api/products')).body.products;
    assert.equal((await api('/api/products?q=')).body.products.length, all.length);
    assert.equal((await api('/api/products?q=%20%20')).body.products.length, all.length);
  });

  test('GET /api/products?q= returns an empty list when nothing matches', async () => {
    const { status, body } = await api('/api/products?q=zzz-no-such-thing');
    assert.equal(status, 200);
    assert.deepEqual(body.products, []);
  });

  test('a product found by search can be added to the wishlist', async () => {
    const [found] = (await api('/api/products?q=mug')).body.products;
    const added = await api('/api/wishlist', { method: 'POST', body: { productId: found.id } });
    assert.equal(added.status, 201);
  });

  test('GET /api/products/:id returns one product', async () => {
    const { status, body } = await api('/api/products/p1');
    assert.equal(status, 200);
    assert.equal(body.product.id, 'p1');
  });

  test('GET /api/products/:id returns 404 for an unknown product', async () => {
    const { status, body } = await api('/api/products/nope');
    assert.equal(status, 404);
    assert.equal(body.error, 'Product not found');
  });
});

describe('wishlist', () => {
  test('GET /api/wishlist starts empty', async () => {
    const { status, body } = await api('/api/wishlist');
    assert.equal(status, 200);
    assert.deepEqual(body, { items: [] });
  });

  test('GET /api/wishlist includes product details', async () => {
    store.reset({ wishlist: [{ productId: 'p2', addedAt: '2026-01-01T00:00:00.000Z' }] });
    const { body } = await api('/api/wishlist');
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].product.name, 'Linen Tote Bag');
  });

  test('GET /api/wishlist skips products that no longer exist', async () => {
    store.reset({ wishlist: [{ productId: 'gone', addedAt: '2026-01-01T00:00:00.000Z' }] });
    const { body } = await api('/api/wishlist');
    assert.deepEqual(body.items, []);
  });
});

describe('adding to the wishlist', () => {
  test('POST /api/wishlist adds a product and returns 201', async () => {
    const { status, body } = await api('/api/wishlist', { method: 'POST', body: { productId: 'p1' } });
    assert.equal(status, 201);
    assert.equal(body.item.productId, 'p1');
    assert.equal(body.item.product.name, 'Ceramic Mug');
    assert.ok(body.item.addedAt);
    const list = await api('/api/wishlist');
    assert.equal(list.body.items.length, 1);
  });

  test('adding a duplicate returns 409 and does not add it twice', async () => {
    await api('/api/wishlist', { method: 'POST', body: { productId: 'p1' } });
    const { status, body } = await api('/api/wishlist', { method: 'POST', body: { productId: 'p1' } });
    assert.equal(status, 409);
    assert.ok(body.error);
    const list = await api('/api/wishlist');
    assert.equal(list.body.items.length, 1);
  });

  test('an unknown productId returns 404', async () => {
    const { status } = await api('/api/wishlist', { method: 'POST', body: { productId: 'nope' } });
    assert.equal(status, 404);
  });

  test('a missing or non-string productId returns 400', async () => {
    for (const body of [{}, { productId: 5 }, { productId: null }, { productId: '' }]) {
      const res = await api('/api/wishlist', { method: 'POST', body });
      assert.equal(res.status, 400);
    }
  });

  test('an invalid JSON body returns 400', async () => {
    const res = await fetch(baseUrl + '/api/wishlist', { method: 'POST', body: '{oops' });
    assert.equal(res.status, 400);
  });
});

describe('wishlist limit', () => {
  const fill = (n) => ({
    wishlist: Array.from({ length: n }, (_, i) => ({ productId: `x${i}`, addedAt: '2026-01-01T00:00:00.000Z' })),
  });

  test('the limit is 100', () => {
    assert.equal(MAX_WISHLIST_ITEMS, 100);
  });

  test('adding when the wishlist is full returns 409', async () => {
    store.reset(fill(MAX_WISHLIST_ITEMS));
    const { status, body } = await api('/api/wishlist', { method: 'POST', body: { productId: 'p1' } });
    assert.equal(status, 409);
    assert.equal(body.error, 'Your wishlist is full (100 items)');
    assert.equal(store.countWishlist(), MAX_WISHLIST_ITEMS);
  });

  test('the last allowed item can still be added', async () => {
    store.reset(fill(MAX_WISHLIST_ITEMS - 1));
    const { status } = await api('/api/wishlist', { method: 'POST', body: { productId: 'p1' } });
    assert.equal(status, 201);
  });

  test('a wishlist with exactly 100 items loads', async () => {
    store.reset(fill(MAX_WISHLIST_ITEMS));
    const { status, body } = await api('/api/wishlist');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.items));
  });
});

describe('removing from the wishlist', () => {
  test('removes an item and returns 200', async () => {
    await api('/api/wishlist', { method: 'POST', body: { productId: 'p1' } });
    const { status } = await api('/api/wishlist/p1', { method: 'DELETE' });
    assert.equal(status, 200);
    const { body } = await api('/api/wishlist');
    assert.deepEqual(body.items, []);
  });

  test('a removed product can be added again', async () => {
    await api('/api/wishlist', { method: 'POST', body: { productId: 'p1' } });
    await api('/api/wishlist/p1', { method: 'DELETE' });
    const { status } = await api('/api/wishlist', { method: 'POST', body: { productId: 'p1' } });
    assert.equal(status, 201);
  });

  test('removing an item that is not in the wishlist returns 404', async () => {
    const { status, body } = await api('/api/wishlist/p1', { method: 'DELETE' });
    assert.equal(status, 404);
    assert.ok(body.error);
  });
});

describe('wishlist notes', () => {
  const add = (productId) => api('/api/wishlist', { method: 'POST', body: { productId } });
  const patch = (body, id = 'p1') => api(`/api/wishlist/${id}`, { method: 'PATCH', body });

  test('POST, GET and PATCH return items with the same fields', async () => {
    const created = (await add('p1')).body.item;
    const listed = (await api('/api/wishlist')).body.items[0];
    const patched = (await patch({ quantity: 2 })).body.item;
    const keys = (item) => Object.keys(item).sort();
    assert.equal(created.note, null);
    assert.deepEqual(keys(created), keys(listed));
    assert.deepEqual(keys(patched), keys(listed));
  });

  test('saves a trimmed note, alone or with quantity, and lists it', async () => {
    await add('p1');
    const { status, body } = await patch({ note: '  for <Mum> & co  ' });
    assert.equal(status, 200);
    assert.equal(body.item.note, 'for <Mum> & co');
    assert.equal(body.item.quantity, 1);
    const both = await patch({ note: 'in blue', quantity: 3 });
    assert.equal(both.body.item.note, 'in blue');
    assert.equal(both.body.item.quantity, 3);
    assert.equal((await api('/api/wishlist')).body.items[0].note, 'in blue');
  });

  test('items without a note have note null; empty note removes it', async () => {
    await add('p1');
    assert.equal((await api('/api/wishlist')).body.items[0].note, null);
    await patch({ note: 'x' });
    const cleared = await patch({ note: '   ' });
    assert.equal(cleared.body.item.note, null);
    assert.equal((await api('/api/wishlist')).body.items[0].note, null);
  });

  test('note errors: too long and non-string are 400, missing item is 404', async () => {
    await add('p1');
    assert.equal((await patch({ note: 'a'.repeat(200) })).status, 200);
    const long = await patch({ note: ` ${'a'.repeat(201)} ` });
    assert.equal(long.status, 400);
    assert.equal(long.body.error, 'Notes can be at most 200 characters');
    assert.equal((await patch({ note: 5 })).status, 400);
    assert.equal((await patch({ note: null })).status, 400);
    assert.equal((await patch({ note: 'hi' }, 'p2')).status, 404);
  });

  test('an invalid quantity does not save the note', async () => {
    await add('p1');
    assert.equal((await patch({ note: 'keep?', quantity: 99 })).status, 400);
    assert.equal((await api('/api/wishlist')).body.items[0].note, null);
  });

  test('notes are private: the shared API leaves them out', async () => {
    await add('p1');
    await patch({ note: 'secret' });
    const { body: share } = await api('/api/share', { method: 'POST' });
    const shared = await api(`/api/shared/${share.token}`);
    assert.equal(shared.status, 200);
    assert.ok(!('note' in shared.body.items[0]));
    assert.ok(!JSON.stringify(shared.body).includes('secret'));
  });

  test('notes survive a restart', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wishlist-'));
    try {
      const file = join(dir, 'db.json');
      const first = createStore({ file });
      first.addToWishlist('p3');
      first.updateWishlistItem('p3', { note: 'for Mum' });
      assert.equal(createStore({ file }).getWishlist()[0].note, 'for Mum');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('wishlist persistence', () => {
  test('the wishlist survives a restart', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wishlist-'));
    try {
      const file = join(dir, 'db.json');
      createStore({ file }).addToWishlist('p3');
      const reloaded = createStore({ file });
      assert.deepEqual(reloaded.getWishlist().map((e) => e.productId), ['p3']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('errors and static files', () => {
  test('unknown API path returns 404 JSON', async () => {
    const { status, body } = await api('/api/unknown');
    assert.equal(status, 404);
    assert.equal(body.error, 'Not found');
  });

  test('wrong method on a known path returns 405', async () => {
    const { status } = await api('/api/products', { method: 'DELETE' });
    assert.equal(status, 405);
  });

  test('home page is served', async () => {
    const res = await fetch(baseUrl + '/');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(await res.text(), /Wishlist Shop/);
  });

  test('files outside public/ cannot be read', async () => {
    const res = await fetch(baseUrl + '/..%2Fpackage.json');
    assert.equal(res.status, 404);
  });
});

describe('sharing the wishlist', () => {
  async function page(path) {
    const res = await fetch(baseUrl + path);
    return { status: res.status, type: res.headers.get('content-type'), text: await res.text() };
  }

  test('POST /api/share creates a long random token and a path', async () => {
    const { status, body } = await api('/api/share', { method: 'POST' });
    assert.equal(status, 201);
    assert.ok(body.token.length >= 16);
    assert.match(body.token, /^[A-Za-z0-9_-]+$/);
    assert.equal(body.path, `/shared/${body.token}`);
    const again = await api('/api/share', { method: 'POST' });
    assert.equal(again.body.token, body.token);
  });

  test('the shared API shows the wishlist as it is now', async () => {
    await api('/api/wishlist', { method: 'POST', body: { productId: 'p1' } });
    const { body: share } = await api('/api/share', { method: 'POST' });
    let shared = await api(`/api/shared/${share.token}`);
    assert.equal(shared.status, 200);
    assert.deepEqual(shared.body.items.map((i) => i.productId), ['p1']);
    assert.equal(typeof shared.body.items[0].product.price, 'number');

    await api('/api/wishlist', { method: 'POST', body: { productId: 'p2' } });
    await api('/api/wishlist/p1', { method: 'DELETE' });
    shared = await api(`/api/shared/${share.token}`);
    assert.deepEqual(shared.body.items.map((i) => i.productId), ['p2']);
  });

  test('the shared page opens for a valid token and has no buttons', async () => {
    const { body: share } = await api('/api/share', { method: 'POST' });
    const { status, type, text } = await page(share.path);
    assert.equal(status, 200);
    assert.match(type, /text\/html/);
    assert.doesNotMatch(text, /<button/);
  });

  test('an unknown token gives 404 (API and page)', async () => {
    await api('/api/share', { method: 'POST' });
    const { status, body } = await api('/api/shared/not-a-real-token');
    assert.equal(status, 404);
    assert.ok(body.error);
    const bad = await page('/shared/not-a-real-token');
    assert.equal(bad.status, 404);
    assert.match(bad.type, /text\/html/);
    assert.match(bad.text, /This wishlist link doesn&#39;t work|This wishlist link doesn't work/);
  });

  test('a token is unknown before any link was created, and bad escapes give 404', async () => {
    assert.equal((await page('/shared/abc')).status, 404);
    assert.equal((await page('/shared/%E0%A4%A')).status, 404);
  });
});

describe('wishlist quantity, total, sorting and filtering', () => {
  const add = (productId, quantity) =>
    api('/api/wishlist', { method: 'POST', body: quantity === undefined ? { productId } : { productId, quantity } });

  test('new items have quantity 1; quantity can be given when adding', async () => {
    const a = await add('p1');
    assert.equal(a.body.item.quantity, 1);
    const b = await add('p2', 3);
    assert.equal(b.status, 201);
    assert.equal(b.body.item.quantity, 3);
  });

  test('old stored entries without a quantity count as 1', async () => {
    store.reset({ wishlist: [{ productId: 'p1', addedAt: '2026-01-01T00:00:00.000Z' }] });
    const { body } = await api('/api/wishlist');
    assert.equal(body.items[0].quantity, 1);
    assert.equal((await api('/api/wishlist/total')).body.total, 1800);
  });

  test('invalid quantity when adding returns 400', async () => {
    for (const quantity of [0, 11, 1.5, '2', null]) {
      const res = await add('p1', quantity);
      assert.equal(res.status, 400, `quantity ${JSON.stringify(quantity)}`);
      assert.equal(res.body.error, 'Quantity must be a whole number from 1 to 10');
    }
    assert.deepEqual((await api('/api/wishlist')).body.items, []);
  });

  test('PATCH changes the quantity', async () => {
    await add('p1');
    const { status, body } = await api('/api/wishlist/p1', { method: 'PATCH', body: { quantity: 10 } });
    assert.equal(status, 200);
    assert.equal(body.item.quantity, 10);
    assert.equal((await api('/api/wishlist')).body.items[0].quantity, 10);
  });

  test('PATCH errors: bad quantity is 400, missing item is 404', async () => {
    await add('p1');
    const bad = await api('/api/wishlist/p1', { method: 'PATCH', body: { quantity: 11 } });
    assert.equal(bad.status, 400);
    const missing = await api('/api/wishlist/p2', { method: 'PATCH', body: { quantity: 2 } });
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error, 'Product is not in your wishlist');
  });

  test('total is price x quantity in cents', async () => {
    await add('p1', 2); // 1800 x 2
    await add('p5', 1); // 1200
    assert.equal((await api('/api/wishlist/total')).body.total, 4800);
    const filtered = await api('/api/wishlist?q=mug');
    assert.equal(filtered.body.items.length, 1);
    assert.equal((await api('/api/wishlist/total')).body.total, 4800, 'total ignores the filter');
  });

  test('total of an empty wishlist is 0', async () => {
    assert.deepEqual((await api('/api/wishlist/total')).body, { total: 0 });
  });

  test('sorting by name, price and date added', async () => {
    store.reset({
      wishlist: [
        { productId: 'p3', addedAt: '2026-01-01T00:00:00.000Z', quantity: 1 }, // Desk Plant 3200
        { productId: 'p1', addedAt: '2026-01-02T00:00:00.000Z', quantity: 1 }, // Ceramic Mug 1800
        { productId: 'p8', addedAt: '2026-01-03T00:00:00.000Z', quantity: 1 }, // Enamel Pin 900
      ],
    });
    const ids = async (query) => (await api(`/api/wishlist${query}`)).body.items.map((i) => i.productId);
    assert.deepEqual(await ids(''), ['p3', 'p1', 'p8']);
    assert.deepEqual(await ids('?sort=added'), ['p3', 'p1', 'p8']);
    assert.deepEqual(await ids('?sort=name'), ['p1', 'p3', 'p8']);
    assert.deepEqual(await ids('?sort=price-asc'), ['p8', 'p1', 'p3']);
    assert.deepEqual(await ids('?sort=price-desc'), ['p3', 'p1', 'p8']);
  });

  test('unknown sort returns 400', async () => {
    const { status, body } = await api('/api/wishlist?sort=colour');
    assert.equal(status, 400);
    assert.match(body.error, /sort must be one of/);
  });

  test('filtering by name ignores case; no match gives an empty list', async () => {
    await add('p1');
    await add('p2');
    const hit = await api('/api/wishlist?q=TOTE');
    assert.deepEqual(hit.body.items.map((i) => i.productId), ['p2']);
    const none = await api('/api/wishlist?q=zzz');
    assert.deepEqual(none.body.items, []);
  });

  test('the shared wishlist shows quantities and the total', async () => {
    await add('p1', 2);
    const { body: share } = await api('/api/share', { method: 'POST' });
    const { body } = await api(`/api/shared/${share.token}`);
    assert.equal(body.items[0].quantity, 2);
    assert.equal(body.total, 3600);
  });
});

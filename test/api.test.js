// API tests. Each test gets a fresh server with an in-memory store.
// Run with: npm test

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app.js';
import { createStore } from '../src/store.js';

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

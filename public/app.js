// Web page logic. Loads products and the wishlist from the API and shows them.
// Always set text with textContent (never innerHTML) so data can't inject HTML.

import { openNoteEditor } from './note-editor.js';

const productList = document.getElementById('product-list');
const productsStatus = document.getElementById('products-status');
const wishlistList = document.getElementById('wishlist-list');
const wishlistStatus = document.getElementById('wishlist-status');
const actionStatus = document.getElementById('action-status');

const wishlistTotal = document.getElementById('wishlist-total');
const searchInput = document.getElementById('wishlist-search');
const productSearch = document.getElementById('product-search');
const sortSelect = document.getElementById('wishlist-sort');
const MAX_QUANTITY = 10;

let products = [];
let wishlistIds = new Set();

export function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function refreshWishlist() {
  const params = new URLSearchParams({ sort: sortSelect.value, q: searchInput.value });
  const [{ items }, { total }] = await Promise.all([
    getJson(`/api/wishlist?${params}`),
    getJson('/api/wishlist/total'),
  ]);
  renderWishlist(items, total);
}

async function changeQuantity(productId, quantity) {
  actionStatus.textContent = '';
  try {
    const res = await fetch(`/api/wishlist/${encodeURIComponent(productId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${res.status})`);
    }
  } catch (err) {
    console.error(err);
    actionStatus.textContent = `Could not change the quantity: ${err.message}`;
  }
  try {
    await refreshWishlist();
  } catch (err) {
    console.error(err);
  }
}

async function patchNote(productId, note) {
  actionStatus.textContent = '';
  const res = await fetch(`/api/wishlist/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
}

function focusEditNote(productId) {
  for (const row of wishlistList.children) {
    if (row.dataset.productId === productId) row.querySelector('.edit-note')?.focus();
  }
}

function editNote(item, noteText, editButton) {
  openNoteEditor({
    name: item.product.name,
    note: item.note,
    noteText,
    editButton,
    create: (tag) => document.createElement(tag),
    save: (note) => patchNote(item.productId, note),
    onError: (err) => {
      console.error(err);
      actionStatus.textContent = `Could not save the note: ${err.message}`;
    },
    onSaved: async () => {
      try {
        await refreshWishlist();
      } catch (err) {
        console.error(err);
      }
      focusEditNote(item.productId);
    },
  });
}

async function addToWishlist(productId) {
  actionStatus.textContent = '';
  try {
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = body.error || `Request failed (${res.status})`;
      if (res.status !== 409) throw new Error(message);
      // 409: already in the list, or the list is full. Show why, then refresh.
      actionStatus.textContent = message;
    }
    await refreshWishlist();
  } catch (err) {
    console.error(err);
    actionStatus.textContent = `Could not add to wishlist: ${err.message}`;
  }
}

async function removeFromWishlist(productId) {
  actionStatus.textContent = '';
  try {
    const res = await fetch(`/api/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' });
    // 404 means it is already gone; just refresh the list below.
    if (!res.ok && res.status !== 404) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${res.status})`);
    }
    await refreshWishlist();
  } catch (err) {
    console.error(err);
    actionStatus.textContent = `Could not remove from wishlist: ${err.message}`;
  }
}

function renderProducts() {
  productList.replaceChildren(
    ...products.map((product) => {
      const card = el('li', 'product-card');
      card.dataset.productId = product.id;
      const saved = wishlistIds.has(product.id);
      const button = el('button', '', saved ? 'In wishlist' : 'Add to wishlist');
      button.type = 'button';
      button.disabled = saved;
      button.addEventListener('click', () => addToWishlist(product.id));
      card.append(
        el('h3', 'product-name', product.name),
        el('p', 'product-description', product.description),
        el('p', 'product-price', formatPrice(product.price)),
        button,
      );
      return card;
    }),
  );
  productsStatus.hidden = products.length > 0;
  productsStatus.textContent = productSearch.value.trim() !== ''
    ? 'No products match your search.'
    : 'No products yet.';
}

function renderWishlist(items, total) {
  wishlistIds = new Set(items.map((item) => item.productId));
  renderProducts();
  wishlistList.replaceChildren(
    ...items.map((item) => {
      const row = el('li', 'wishlist-item');
      row.dataset.productId = item.productId;
      const remove = el('button', '', 'Remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${item.product.name} from wishlist`);
      remove.addEventListener('click', () => removeFromWishlist(item.productId));
      const qty = el('input', 'wishlist-qty');
      qty.type = 'number';
      qty.min = '1';
      qty.max = String(MAX_QUANTITY);
      qty.step = '1';
      qty.value = String(item.quantity);
      qty.setAttribute('aria-label', `Quantity of ${item.product.name}`);
      qty.addEventListener('change', () => changeQuantity(item.productId, Number(qty.value)));
      const noteText = el('span', 'wishlist-note', item.note ?? '');
      const editNoteButton = el('button', 'edit-note', 'Edit note');
      editNoteButton.type = 'button';
      editNoteButton.setAttribute('aria-label', `Edit note for ${item.product.name}`);
      editNoteButton.addEventListener('click', () => editNote(item, noteText, editNoteButton));
      row.append(
        el('span', 'wishlist-name', item.product.name),
        qty,
        el('span', 'wishlist-price', formatPrice(item.product.price * item.quantity)),
        editNoteButton,
        remove,
        noteText,
      );
      return row;
    }),
  );
  wishlistStatus.hidden = items.length > 0;
  const filtering = searchInput.value.trim() !== '';
  wishlistStatus.textContent = filtering ? 'No items match your search.' : 'Your wishlist is empty.';
  wishlistTotal.textContent = total > 0 ? `Total: ${formatPrice(total)}` : '';
}

searchInput.addEventListener('input', () => refreshWishlist().catch((err) => {
  console.error(err);
  actionStatus.textContent = `Could not update the wishlist: ${err.message}`;
}));
sortSelect.addEventListener('change', () => searchInput.dispatchEvent(new Event('input')));

let productSearchId = 0;
productSearch.addEventListener('input', async () => {
  const id = ++productSearchId;
  try {
    const params = new URLSearchParams({ q: productSearch.value });
    const { products: found } = await getJson(`/api/products?${params}`);
    if (id !== productSearchId) return; // a newer search is in flight
    products = found;
    renderProducts();
  } catch (err) {
    console.error(err);
    actionStatus.textContent = `Could not search products: ${err.message}`;
  }
});

const shareButton = document.getElementById('share-button');
const shareResult = document.getElementById('share-result');
const shareLink = document.getElementById('share-link');
const copyButton = document.getElementById('copy-button');
const shareStatus = document.getElementById('share-status');

shareButton.addEventListener('click', async () => {
  shareStatus.textContent = '';
  try {
    const res = await fetch('/api/share', { method: 'POST' });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const { path } = await res.json();
    shareLink.value = new URL(path, window.location.origin).href;
    shareResult.hidden = false;
  } catch (err) {
    console.error(err);
    shareStatus.textContent = `Could not create a share link: ${err.message}`;
  }
});

copyButton.addEventListener('click', async () => {
  shareStatus.textContent = '';
  try {
    await navigator.clipboard.writeText(shareLink.value);
    shareStatus.textContent = 'Link copied.';
  } catch (err) {
    console.error(err);
    shareLink.select();
    shareStatus.textContent = 'Could not copy automatically. The link is selected: copy it by hand.';
  }
});

async function load() {
  try {
    const { products: loaded } = await getJson('/api/products');
    products = loaded;
    await refreshWishlist();
  } catch (err) {
    console.error(err);
    productsStatus.textContent = 'Could not load the shop. Please refresh.';
    wishlistStatus.textContent = '';
  }
}

load();
